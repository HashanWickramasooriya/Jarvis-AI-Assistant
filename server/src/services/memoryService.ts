import { getSupabase } from "../lib/supabase.js";
import { capabilities } from "../env.js";
import type { Memory, ConversationMessage, Role } from "../types.js";

export const memoryUnavailableMessage =
  "Cloud memory is currently offline. Conversation can continue without persistent memory.";

export const deviceIdMissingMessage =
  "This request has no device identity attached, so memory cannot be read or written.";

export function isMemoryAvailable(): boolean {
  return capabilities.memory;
}

// All memory reads/writes are scoped to a client-supplied device id (see
// server/src/middleware/deviceId.ts) so that memory created on one browser
// never appears on another — there is no authenticated user system in this
// app, so "device" is the only identity boundary available. `deviceId` is
// intentionally required (not optional) on every function below: a memory
// call with no device id has no safe scope to read or write, so callers
// must resolve that before reaching this module (routes return early with
// deviceIdMissingMessage instead of calling in with an empty id).

export async function listMemories(deviceId: string): Promise<Memory[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("device_id", deviceId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function rememberFact(
  deviceId: string,
  category: string,
  key: string,
  value: string,
  importance = 3
): Promise<Memory> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { data, error } = await supabase
    .from("memories")
    .upsert(
      { device_id: deviceId, category, key, value, importance },
      { onConflict: "device_id,category,key" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function forgetFact(deviceId: string, category: string, key: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("device_id", deviceId)
    .eq("category", category)
    .eq("key", key);
  if (error) throw new Error(error.message);
  return true;
}

export async function forgetMemoryById(deviceId: string, id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("device_id", deviceId)
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function clearAllMemories(deviceId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("device_id", deviceId);
  if (error) throw new Error(error.message);
  return true;
}

export async function findMemory(deviceId: string, category: string, key: string): Promise<Memory | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("device_id", deviceId)
    .eq("category", category)
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

// --- Conversation history ---

export async function appendMessage(
  sessionId: string,
  role: Role,
  message: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return; // degrade gracefully
  const { error } = await supabase
    .from("conversations")
    .insert({ session_id: sessionId, role, message });
  if (error) throw new Error(error.message);
}

const CONTEXT_WINDOW_MESSAGES = 20;

export async function getRecentHistory(
  sessionId: string,
  limit = CONTEXT_WINDOW_MESSAGES
): Promise<ConversationMessage[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).reverse();
}

export async function clearConversation(sessionId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return true;
}
