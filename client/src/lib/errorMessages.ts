/**
 * Maps raw fetch/service errors to short, cinematic HUD-style status lines.
 * Never surfaces stack traces or raw provider error bodies to the user.
 */
export function toHudMessage(err: unknown, fallback = "SYSTEM FAULT"): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return "CONNECTION LOST — backend unreachable.";
  }
  if (lower.includes("ai core is temporarily unavailable") || lower.includes("openrouter")) {
    return "AI CORE TEMPORARILY UNAVAILABLE.";
  }
  if (lower.includes("cloud memory is currently offline")) {
    return "MEMORY CONNECTION LOST — running without persistent memory.";
  }
  if (lower.includes("voice synthesis") || lower.includes("groq tts")) {
    return "VOICE SYNTHESIS UNAVAILABLE.";
  }
  if (lower.includes("no speech was detected")) {
    return "No speech was detected. Please try again.";
  }
  if (lower.includes("too short")) {
    return raw;
  }
  if (lower.includes("voice processing error")) {
    return "VOICE PROCESSING ERROR.";
  }
  if (lower.includes("speech recognition")) {
    return "VOICE INPUT UNAVAILABLE.";
  }
  if (lower.includes("microphone access was denied")) {
    return "MICROPHONE ACCESS DENIED.";
  }
  if (lower.includes("unable to access the microphone") || lower.includes("does not support")) {
    return "MICROPHONE UNAVAILABLE.";
  }
  if (lower.includes("live web search is unavailable")) {
    return "SEARCH MODULE OFFLINE.";
  }
  if (raw.length > 0 && raw.length < 120) {
    return raw;
  }
  return fallback;
}
