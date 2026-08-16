import { getSupabase } from "../lib/supabase.js";
import { capabilities } from "../env.js";
import { memoryUnavailableMessage } from "./memoryService.js";

export function isPreferencesAvailable(): boolean {
  return capabilities.memory;
}

export async function listPreferences(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from("user_preferences").select("key, value");
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export async function setPreference(key: string, value: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(memoryUnavailableMessage);
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
