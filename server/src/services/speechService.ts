import { env, capabilities } from "../env.js";

export const sttUnavailableMessage =
  "Speech recognition is currently unavailable. Please try typing instead.";
export const sttProcessingErrorMessage =
  "Voice processing error. Please try again.";
export const noSpeechDetectedMessage =
  "No speech was detected in that recording. Please try again.";

export function isSttAvailable(): boolean {
  return capabilities.stt;
}

interface WhisperSegment {
  text?: string;
  no_speech_prob?: number;
  avg_logprob?: number;
}

interface WhisperVerboseResponse {
  text?: string;
  segments?: WhisperSegment[];
}

// Whisper-family models are well known to hallucinate short stock phrases
// ("Thank you.", "Thanks for watching!", etc.) when fed silence, near-silence,
// or very short/noisy clips — this is a model artifact, not something our
// code injects. Whisper itself exposes a per-segment `no_speech_prob`
// confidence score specifically to flag this; requesting verbose_json and
// checking that score is the correct, non-hardcoded way to catch it (no
// phrase list involved, since a legitimate "Thank you" from the user must
// still work).
const NO_SPEECH_PROB_THRESHOLD = 0.6;
const AVG_LOGPROB_THRESHOLD = -1.0;

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (!env.GROQ_API_KEY) throw new Error(sttUnavailableMessage);

  const form = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || "audio/webm" });
  form.append("file", blob, filename || "audio.webm");
  form.append("model", env.GROQ_STT_MODEL);
  form.append("response_format", "verbose_json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // Log the raw provider error server-side only; never let it reach the
    // client, since it may contain implementation/provider details.
    console.error(`[STT] Groq error ${response.status}: ${body.slice(0, 500)}`);
    throw new Error(sttProcessingErrorMessage);
  }

  const data = (await response.json()) as WhisperVerboseResponse;
  const text = data.text?.trim();

  if (!text) {
    console.log("[STT] empty text from Whisper");
    throw new Error(noSpeechDetectedMessage);
  }

  const segments = data.segments ?? [];
  if (segments.length > 0) {
    const avgNoSpeechProb =
      segments.reduce((sum, s) => sum + (s.no_speech_prob ?? 0), 0) / segments.length;
    const avgLogprob =
      segments.reduce((sum, s) => sum + (s.avg_logprob ?? 0), 0) / segments.length;

    console.log(
      `[STT] confidence check — no_speech_prob: ${avgNoSpeechProb.toFixed(3)}, avg_logprob: ${avgLogprob.toFixed(3)}`
    );

    // High no_speech_prob combined with low avg_logprob means Whisper
    // itself is not confident real speech was present — almost certainly
    // a hallucinated stock phrase from silence/noise, not the user's words.
    if (avgNoSpeechProb > NO_SPEECH_PROB_THRESHOLD && avgLogprob < AVG_LOGPROB_THRESHOLD) {
      console.log(`[STT] rejected as likely hallucination: "${text}"`);
      throw new Error(noSpeechDetectedMessage);
    }
  }

  console.log(`[STT] transcription: "${text}"`);
  return text;
}
