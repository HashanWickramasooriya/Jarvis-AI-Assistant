import { Router } from "express";
import { generateReply, aiUnavailableMessage } from "../services/aiService.js";
import {
  appendMessage,
  getRecentHistory,
  listMemories,
  memoryUnavailableMessage,
} from "../services/memoryService.js";
import { tryHandleCommand } from "../services/commandService.js";

export const chatRouter = Router();

chatRouter.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body as { message?: string; sessionId?: string };
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const session = sessionId || "default";

    // Persist the user's turn regardless of how it's handled.
    await appendMessage(session, "user", message).catch(() => {});

    // Deterministic commands (time, date, memory management) bypass the AI.
    // A command failure (e.g. memory unreachable) is a memory problem, not
    // an AI problem, so it gets its own honest error rather than falling
    // through to the generic "AI core unavailable" message below.
    try {
      const command = await tryHandleCommand(message, session);
      if (command.handled) {
        const reply = command.reply ?? "Done.";
        await appendMessage(session, "assistant", reply).catch(() => {});
        return res.json({ reply, source: "command" });
      }
    } catch (err) {
      console.error("Command handling failed:", err);
      return res.status(502).json({ error: memoryUnavailableMessage });
    }

    // Memory reads must never take down the conversation: a missing table,
    // an unapplied migration, or a transient Supabase outage should degrade
    // to "no context available" rather than surface a raw DB error.
    const [history, memories] = await Promise.all([
      getRecentHistory(session).catch((err) => {
        console.error("getRecentHistory failed, continuing without history:", err);
        return [];
      }),
      listMemories().catch((err) => {
        console.error("listMemories failed, continuing without memories:", err);
        return [];
      }),
    ]);

    const reply = await generateReply(message, history, memories);
    await appendMessage(session, "assistant", reply).catch(() => {});

    res.json({ reply, source: "ai" });
  } catch (err) {
    // Log the real error server-side for debugging, but never forward raw
    // provider/database error text to the client.
    console.error("Chat request failed:", err);
    res.status(502).json({ error: aiUnavailableMessage });
  }
});
