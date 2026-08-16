import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, capabilities } from "../env.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!capabilities.memory) return null;
  if (!client) {
    client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}
