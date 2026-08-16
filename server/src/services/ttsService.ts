import { env, capabilities } from "../env.js";

export const ttsUnavailableMessage = "Voice synthesis is currently unavailable.";

export function isTtsAvailable(): boolean {
  return capabilities.tts;
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  if (!env.GROQ_API_KEY) throw new Error(ttsUnavailableMessage);

  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.GROQ_TTS_MODEL,
      voice: env.GROQ_TTS_VOICE,
      input: text,
      response_format: "wav",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq TTS error ${response.status}: ${body.slice(0, 500)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
