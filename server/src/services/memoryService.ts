import { getSupabase } from "../lib/supabase.js";
import { capabilities } from "../env.js";
import type { Memory, ConversationMessage, Role } from "../types.js";

export const memoryUnavailableMessage =
  "Cloud memory is currently offline. Conversation can continue without persistent memory.";

export function isMemoryAvailable(): boolean {
  return capabilities.memory;
}

export async function listMemories(): Promise<Memory[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function rememberFact(
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
      { category, key, value, importance },
      { onConflict: "category,key" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function forgetFact(category: string, key: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("category", category)
    .eq("key", key);
  if (error) throw new Error(error.message);
  return true;
}

export async function forgetMemoryById(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function clearAllMemories(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("memories")
    .delete()
    .not("id", "is", null);
  if (error) throw new Error(error.message);
  return true;
}

export async function findMemory(category: string, key: string): Promise<Memory | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("memories")
    .select("*")
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
