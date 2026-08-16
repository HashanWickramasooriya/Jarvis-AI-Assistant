import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { deviceIdMiddleware } from "./middleware/deviceId.js";
import { statusRouter } from "./routes/status.js";
import { chatRouter } from "./routes/chat.js";
import { sttRouter } from "./routes/stt.js";
import { ttsRouter } from "./routes/tts.js";
import { memoryRouter } from "./routes/memory.js";
import { conversationsRouter } from "./routes/conversations.js";
import { searchRouter } from "./routes/search.js";
import { preferencesRouter } from "./routes/preferences.js";

/**
 * The Express app itself, with no listener attached. Shared between the
 * local dev entrypoint (src/index.ts, which calls app.listen) and the
 * Vercel serverless entrypoint (/api/index.ts), which invokes the app
 * directly as a request handler.
 */
export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));
app.use(deviceIdMiddleware);

app.use("/api/status", statusRouter);
app.use("/api/chat", chatRouter);
app.use("/api/stt", sttRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/search", searchRouter);
app.use("/api/preferences", preferencesRouter);

// Never let an unhandled error crash the whole process.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);
