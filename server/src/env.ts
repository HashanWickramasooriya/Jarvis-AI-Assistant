import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Local dev convenience only: load the root-level .env (and an optional
// server-local override) relative to this file. This must never throw —
// once this file is bundled into a CJS serverless function (Vercel/Netlify
// both use esbuild, which empties `import.meta` in CJS output),
// `import.meta.url` is unavailable and fileURLToPath would throw. That's
// fine: deployed environments inject real env vars directly into
// process.env via the platform dashboard, so file-based loading is
// unnecessary there.
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
} catch {
  // Bundled/serverless context — process.env is authoritative there.
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export const env = {
  PORT: Number(process.env.PORT ?? 8787),

  GROQ_API_KEY: optional("GROQ_API_KEY"),
  GROQ_MODEL: optional("GROQ_MODEL") ?? "openai/gpt-oss-120b",
  GROQ_STT_MODEL: optional("GROQ_STT_MODEL") ?? "whisper-large-v3-turbo",
  GROQ_TTS_MODEL: optional("GROQ_TTS_MODEL") ?? "canopylabs/orpheus-v1-english",
  GROQ_TTS_VOICE: optional("GROQ_TTS_VOICE") ?? "troy",

  SUPABASE_URL: optional("SUPABASE_URL") ?? optional("VITE_SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: optional("SUPABASE_SERVICE_ROLE_KEY"),

  TAVILY_API_KEY: optional("TAVILY_API_KEY"),

  CORS_ORIGIN: optional("CORS_ORIGIN") ?? "http://localhost:5173",
};

export const capabilities = {
  ai: Boolean(env.GROQ_API_KEY),
  stt: Boolean(env.GROQ_API_KEY),
  tts: Boolean(env.GROQ_API_KEY),
  memory: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  search: Boolean(env.TAVILY_API_KEY),
};
