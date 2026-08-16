import { useCallback, useEffect, useRef, useState } from "react";
import { useJarvisStore, makeMessage } from "../state/store";
import {
  sendChatMessage,
  synthesizeSpeech,
  transcribeAudio,
  fetchPreferences,
  setPreference,
} from "../lib/api";
import { useAudioRecorder } from "./useAudioRecorder";
import { useMicLevel, useTtsLevel } from "./useAudioLevel";
import { toHudMessage } from "../lib/errorMessages";

let voiceModeEnabled = true;

export function useAssistant() {
  const sessionId = useJarvisStore((s) => s.sessionId);
  const status = useJarvisStore((s) => s.status);
  const setStatus = useJarvisStore((s) => s.setStatus);
  const addMessage = useJarvisStore((s) => s.addMessage);
  const micError = useJarvisStore((s) => s.micError);
  const setMicError = useJarvisStore((s) => s.setMicError);

  const [voiceMode, setVoiceMode] = useState(voiceModeEnabled);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);

  const recorder = useAudioRecorder();
  const mic = useMicLevel(recorder.stream);

  if (!audioElRef.current && typeof Audio !== "undefined") {
    audioElRef.current = new Audio();
  }
  const ttsLevel = useTtsLevel(audioElRef.current, isSpeaking);
  const level = status === "listening" ? mic.level : status === "speaking" ? ttsLevel : 0;

  useEffect(() => {
    voiceModeEnabled = voiceMode;
  }, [voiceMode]);

  // Load the persisted voice-response preference once on mount (falls back
  // to the in-memory default silently if cloud memory is offline).
  useEffect(() => {
    fetchPreferences()
      .then((prefs) => {
        if (prefs.voice_responses === "false") setVoiceMode(false);
        else if (prefs.voice_responses === "true") setVoiceMode(true);
      })
      .catch(() => {});
  }, []);

  const updateVoiceMode = useCallback((value: boolean) => {
    setVoiceMode(value);
    setPreference("voice_responses", String(value)).catch(() => {});
  }, []);

  const flashIdle = useCallback(
    (message: string) => {
      setStatus("idle", message);
      setTimeout(() => setStatus("idle", null), 1800);
    },
    [setStatus]
  );

  const speak = useCallback(
    async (text: string) => {
      if (!voiceModeEnabled) return;
      let url: string | null = null;
      try {
        const blob = await synthesizeSpeech(text);
        url = URL.createObjectURL(blob);
        const audioEl = audioElRef.current!;
        audioEl.src = url;
        setStatus("speaking");
        setIsSpeaking(true);

        let blocked = false;
        await new Promise<void>((resolve) => {
          audioEl.onended = () => resolve();
          audioEl.onerror = () => resolve();
          audioEl.play().catch((err) => {
            // Autoplay was blocked by the browser (no prior user gesture in
            // this exact call stack). Don't silently drop the response —
            // keep the audio ready and let the user explicitly enable it.
            blocked = err instanceof DOMException && err.name === "NotAllowedError";
            resolve();
          });
        });

        setIsSpeaking(false);
        if (blocked && url) {
          setPendingAudioUrl(url);
          flashIdle("CLICK TO ENABLE VOICE");
        } else {
          if (url) URL.revokeObjectURL(url);
          flashIdle("RESPONSE GENERATED");
        }
      } catch (err) {
        // TTS unavailable: text response already shown, continue silently
        // but surface a brief, honest status note rather than pretending
        // audio played.
        if (url) URL.revokeObjectURL(url);
        setIsSpeaking(false);
        flashIdle(toHudMessage(err, "VOICE SYNTHESIS UNAVAILABLE"));
      }
    },
    [flashIdle, setStatus]
  );

  /** Retries playback of the last synthesized response after an autoplay
   * block, from inside a real user gesture (e.g. a button click). */
  const enableVoicePlayback = useCallback(async () => {
    const audioEl = audioElRef.current;
    if (!audioEl || !pendingAudioUrl) return;
    try {
      setStatus("speaking");
      setIsSpeaking(true);
      await new Promise<void>((resolve) => {
        audioEl.onended = () => resolve();
        audioEl.onerror = () => resolve();
        audioEl.play().catch(() => resolve());
      });
    } finally {
      setIsSpeaking(false);
      URL.revokeObjectURL(pendingAudioUrl);
      setPendingAudioUrl(null);
      flashIdle("RESPONSE GENERATED");
    }
  }, [flashIdle, pendingAudioUrl, setStatus]);

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      addMessage(makeMessage("user", trimmed));
      setStatus("thinking", "PROCESSING REQUEST...");
      try {
        const { reply } = await sendChatMessage(trimmed, sessionId);
        addMessage(makeMessage("assistant", reply));
        if (voiceModeEnabled) {
          await speak(reply);
        } else {
          flashIdle("RESPONSE GENERATED");
        }
      } catch (err) {
        const message = toHudMessage(err, "AI CORE UNAVAILABLE");
        addMessage(makeMessage("assistant", message));
        setStatus("error", message);
        setTimeout(() => setStatus("idle", null), 2500);
      }
    },
    [addMessage, flashIdle, sessionId, setStatus, speak]
  );

  const startListening = useCallback(async () => {
    setMicError(null);
    mic.resetPeak();
    try {
      await recorder.start();
      setStatus("listening", "LISTENING...");
    } catch (err) {
      const message = toHudMessage(err, "MICROPHONE UNAVAILABLE");
      setMicError(message);
      setStatus("error", message);
      setTimeout(() => setStatus("idle", null), 2500);
    }
  }, [mic, recorder, setMicError, setStatus]);

  // Recordings shorter than this are, given click-to-toggle requires two
  // deliberate clicks, essentially never real speech — almost always an
  // accidental double-click or immediate re-click.
  const MIN_RECORDING_MS = 400;
  // Whisper can confidently hallucinate stock phrases ("Thank you.", etc.)
  // on silence — its own no_speech_prob does not reliably flag this (it can
  // report near-zero, i.e. "confident", on a hallucinated result). The
  // AnalyserNode peak captured live during recording is a direct, honest
  // measurement of whether the mic picked up any real speech energy at
  // all, so it catches what Whisper's own confidence score misses.
  const MIN_PEAK_LEVEL = 0.06;

  const stopListeningAndSend = useCallback(async () => {
    setStatus("processing", "PROCESSING VOICE...");
    const recording = await recorder.stop();
    const peak = mic.peakRef.current;
    console.log(`[MIC] peak level during recording: ${peak.toFixed(3)}`);
    if (!recording) {
      setMicError("No audio was captured. Please try again and speak while the mic is listening.");
      setStatus("idle", null);
      return;
    }
    if (recording.durationMs < MIN_RECORDING_MS) {
      setMicError("VOICE INPUT UNAVAILABLE — recording was too short. Hold the mic open and speak.");
      setStatus("idle", null);
      return;
    }
    if (peak < MIN_PEAK_LEVEL) {
      console.log("[MIC] rejected: no meaningful audio energy detected, skipping upload");
      setMicError("No speech was detected. Please try again and speak clearly into the microphone.");
      setStatus("idle", null);
      return;
    }
    try {
      setStatus("processing", "TRANSCRIBING...");
      const { text } = await transcribeAudio(recording.blob);
      if (text && text.trim()) {
        await submitText(text.trim());
      } else {
        // Never forward an empty/no-speech transcription to the AI brain.
        setMicError("No speech was detected. Please try again.");
        setStatus("idle", null);
      }
    } catch (err) {
      const message = toHudMessage(err, "VOICE PROCESSING ERROR");
      setMicError(message);
      setStatus("error", message);
      setTimeout(() => setStatus("idle", null), 2500);
    }
  }, [mic, recorder, setMicError, setStatus, submitText]);

  const toggleListening = useCallback(() => {
    if (status === "listening") {
      void stopListeningAndSend();
    } else if (status === "idle" || status === "error") {
      void startListening();
    }
  }, [status, startListening, stopListeningAndSend]);

  return {
    status,
    level,
    isRecording: recorder.isRecording,
    micError,
    voiceMode,
    setVoiceMode: updateVoiceMode,
    toggleListening,
    pendingAudioUrl,
    enableVoicePlayback,
    submitText,
  };
}
