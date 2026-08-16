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
import { prepareForSpeech } from "../lib/prepareSpeech";

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
  // Monotonic guard against stale playback: bumped by every speak() call
  // and by stopSpeaking(). A speak() call checks this after each await —
  // if it no longer matches the value it captured at the start, a newer
  // call (or an explicit stop) has taken over, so it abandons quietly
  // instead of resolving/rejecting into a state some other call already
  // owns. Prevents the same response being spoken twice and prevents a
  // superseded/cancelled call's onended/onerror from resetting state after
  // a newer one has already started speaking.
  const speechSeqRef = useRef(0);

  const recorder = useAudioRecorder();
  const mic = useMicLevel(recorder.stream);

  if (!audioElRef.current && typeof Audio !== "undefined") {
    audioElRef.current = new Audio();
  }
  const tts = useTtsLevel(audioElRef.current, isSpeaking);
  const level = status === "listening" ? mic.level : status === "speaking" ? tts.level : 0;

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

  /** Immediately stops any JARVIS audio currently playing (or about to
   * play), invalidating whichever speak() call owns it so its eventual
   * onended/onerror/network response can't resurrect state afterward. */
  const stopSpeaking = useCallback(() => {
    speechSeqRef.current += 1;
    const audioEl = audioElRef.current;
    if (audioEl && !audioEl.paused) {
      audioEl.pause();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!voiceModeEnabled) return;
      // Never call TTS with something that isn't real, speakable text —
      // covers a defensive-programming gap, not a currently-reachable bug
      // (every response path in this app already funnels through
      // submitText -> speak(reply) with `reply` always a validated
      // non-empty string from /api/chat).
      if (typeof text !== "string" || !text.trim()) return;
      // Speak the same words the UI shows, minus markdown syntax a voice
      // would otherwise read literally ("asterisk asterisk...") — search-
      // grounded and detailed answers routinely come back with **bold**,
      // bullet lists, and links. The UI still renders the original text
      // unchanged; only the TTS-bound copy is normalized.
      const spokenText = prepareForSpeech(text);
      if (!spokenText) return;
      // Claim ownership of playback before any await. A later speak() or
      // stopSpeaking() call bumps this past `mySeq`, and every checkpoint
      // below bails out the instant that happens rather than fighting a
      // newer call for control of the shared <audio> element/state.
      const mySeq = ++speechSeqRef.current;
      let url: string | null = null;
      try {
        const blob = await synthesizeSpeech(spokenText);
        if (mySeq !== speechSeqRef.current) return; // superseded while fetching audio

        url = URL.createObjectURL(blob);
        const audioEl = audioElRef.current!;
        // Stop whatever's currently playing before taking over the shared
        // element — reassigning .src alone already halts prior playback,
        // this just makes the intent explicit and avoids a brief overlap.
        audioEl.pause();
        audioEl.src = url;
        setStatus("speaking");
        setIsSpeaking(true);

        // Close the AudioContext-suspended race: the visualizer's graph
        // reroutes ALL of this element's output through Web Audio, which
        // is silent until the context is running. Without this await,
        // play() can resolve successfully while producing no audible
        // sound at all — no error, just silence. Verified live in a real
        // browser: without this await, AudioContext.state stays
        // "suspended" through play(); with it, it reaches "running" before
        // play() is called and audio is audible end-to-end.
        await tts.ensureResumed();
        if (mySeq !== speechSeqRef.current) return; // superseded while resuming

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
        if (mySeq !== speechSeqRef.current) {
          // A newer call or stopSpeaking() took over mid-playback — it
          // owns isSpeaking/status now; just release this call's blob.
          if (url) URL.revokeObjectURL(url);
          return;
        }

        setIsSpeaking(false);
        if (blocked && url) {
          setPendingAudioUrl(url);
          flashIdle("CLICK TO ENABLE VOICE");
        } else {
          if (url) URL.revokeObjectURL(url);
          flashIdle("RESPONSE GENERATED");
        }
      } catch (err) {
        if (url) URL.revokeObjectURL(url);
        if (mySeq !== speechSeqRef.current) return; // superseded
        // TTS unavailable: text response already shown, continue silently
        // but surface a brief, honest status note rather than pretending
        // audio played.
        setIsSpeaking(false);
        flashIdle(toHudMessage(err, "VOICE SYNTHESIS UNAVAILABLE"));
      }
    },
    [flashIdle, setStatus, tts]
  );

  /** Retries playback of the last synthesized response after an autoplay
   * block, from inside a real user gesture (e.g. a button click). */
  const enableVoicePlayback = useCallback(async () => {
    const audioEl = audioElRef.current;
    if (!audioEl || !pendingAudioUrl) return;
    const mySeq = ++speechSeqRef.current;
    try {
      setStatus("speaking");
      setIsSpeaking(true);
      await tts.ensureResumed();
      if (mySeq !== speechSeqRef.current) return;
      await new Promise<void>((resolve) => {
        audioEl.onended = () => resolve();
        audioEl.onerror = () => resolve();
        audioEl.play().catch(() => resolve());
      });
    } finally {
      if (mySeq === speechSeqRef.current) setIsSpeaking(false);
      URL.revokeObjectURL(pendingAudioUrl);
      setPendingAudioUrl(null);
      if (mySeq === speechSeqRef.current) flashIdle("RESPONSE GENERATED");
    }
  }, [flashIdle, pendingAudioUrl, setStatus, tts]);

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
    // A new voice query always takes priority over whatever JARVIS was
    // previously saying — stop it before opening the mic so the two never
    // overlap and a stale onended/onerror can't clobber the new state.
    stopSpeaking();
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
  }, [mic, recorder, setMicError, setStatus, stopSpeaking]);

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
    } else if (status === "idle" || status === "error" || status === "speaking") {
      // Clicking the mic while JARVIS is still speaking is a deliberate
      // interrupt (barge-in): startListening() stops the current audio
      // before opening the mic, so the new query always wins.
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
    speak,
  };
}
