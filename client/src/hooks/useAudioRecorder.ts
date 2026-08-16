import { useCallback, useRef, useState } from "react";

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
}

interface UseAudioRecorderResult {
  isRecording: boolean;
  error: string | null;
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
}

// Preferred formats in priority order. Groq Whisper accepts all of these;
// we pick the first the browser's MediaRecorder actually supports rather
// than assuming webm/opus is universal (Safari, for instance, does not
// support it).
const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);

  const start = useCallback(async () => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support microphone capture.";
      setError(message);
      throw new Error(message);
    }
    if (typeof MediaRecorder === "undefined") {
      const message = "This browser does not support audio recording.";
      setError(message);
      throw new Error(message);
    }

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[MIC] permission granted");
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone permission and try again."
          : "Unable to access the microphone.";
      setError(message);
      throw new Error(message);
    }

    // A fresh MediaRecorder + chunk array every session — nothing from a
    // previous recording can ever leak into this one.
    streamRef.current = mediaStream;
    setStream(mediaStream);

    const mimeType = pickSupportedMimeType();
    const recorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorderRef.current = recorder;
    startedAtRef.current = performance.now();
    // Request a data chunk every 250ms so short recordings still flush
    // audio even if stop() fires very quickly after start().
    recorder.start(250);
    setIsRecording(true);
    console.log("[MIC] recording started");
    console.log(`[MIC] mime type: ${recorder.mimeType || "default"}`);
  }, []);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      // Resolve only once MediaRecorder has fully reached its inactive
      // state (onstop fires after that transition), so every pending
      // chunk has already been flushed via ondataavailable.
      recorder.onstop = () => {
        console.log(`[MIC] audio chunks: ${chunksRef.current.length}`);
        const durationMs = Math.round(performance.now() - startedAtRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setStream(null);
        console.log("[MIC] recording stopped");
        console.log(`[MIC] blob size: ${blob.size} bytes`);
        console.log(`[MIC] blob type: ${blob.type}`);
        console.log(`[MIC] duration: ${durationMs}ms`);
        resolve(blob.size > 0 ? { blob, durationMs } : null);
      };
      recorder.stop();
    });
  }, []);

  return { isRecording, error, stream, start, stop };
}
