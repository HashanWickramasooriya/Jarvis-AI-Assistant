import type { ChatMessage, Memory, ServiceStatus } from "../types";
import { getSessionId } from "../state/store";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Identifies "this browser" to the backend so memory/conversations stay
// device-scoped (never shared across a laptop, phone, etc.) — see
// server/src/middleware/deviceId.ts for how this is used server-side.
function deviceHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "X-Device-Id": getSessionId(), ...extra };
}

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON body
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | undefined)?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function getStatus(): Promise<ServiceStatus> {
  const res = await fetch(`${BASE}/api/status`, { headers: deviceHeaders() });
  return asJson<ServiceStatus>(res);
}

export async function sendChatMessage(
  message: string,
  sessionId: string
): Promise<{ reply: string; source: "ai" | "command" }> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: deviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message, sessionId }),
  });
  return asJson(res);
}

export async function transcribeAudio(blob: Blob): Promise<{ text: string }> {
  const form = new FormData();
  form.append("audio", blob, "speech.webm");
  console.log("[STT] uploading real microphone audio");
  const res = await fetch(`${BASE}/api/stt`, { method: "POST", headers: deviceHeaders(), body: form });
  console.log(`[STT] response status: ${res.status}`);
  const data = await asJson<{ text: string }>(res);
  console.log(`[STT] transcription: "${data.text}"`);
  return data;
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const res = await fetch(`${BASE}/api/tts`, {
    method: "POST",
    headers: deviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "TTS failed");
  }
  return res.blob();
}

export async function fetchConversation(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}/api/conversations/${sessionId}`, { headers: deviceHeaders() });
  const data = await asJson<{ messages: ChatMessage[] }>(res);
  return data.messages;
}

export async function clearConversation(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/conversations/${sessionId}`, {
    method: "DELETE",
    headers: deviceHeaders(),
  });
  await asJson(res);
}

export async function fetchMemories(): Promise<Memory[]> {
  const res = await fetch(`${BASE}/api/memory`, { headers: deviceHeaders() });
  const data = await asJson<{ memories: Memory[] }>(res);
  return data.memories;
}

export async function createMemory(
  category: string,
  key: string,
  value: string,
  importance = 3
): Promise<Memory> {
  const res = await fetch(`${BASE}/api/memory`, {
    method: "POST",
    headers: deviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ category, key, value, importance }),
  });
  const data = await asJson<{ memory: Memory }>(res);
  return data.memory;
}

export async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/memory/${id}`, { method: "DELETE", headers: deviceHeaders() });
  await asJson(res);
}

export async function clearAllMemories(): Promise<void> {
  const res = await fetch(`${BASE}/api/memory/all`, { method: "DELETE", headers: deviceHeaders() });
  await asJson(res);
}

export async function fetchPreferences(): Promise<Record<string, string>> {
  const res = await fetch(`${BASE}/api/preferences`, { headers: deviceHeaders() });
  const data = await asJson<{ preferences: Record<string, string> }>(res);
  return data.preferences;
}

export async function setPreference(key: string, value: string): Promise<void> {
  const res = await fetch(`${BASE}/api/preferences`, {
    method: "POST",
    headers: deviceHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ key, value }),
  });
  await asJson(res);
}
