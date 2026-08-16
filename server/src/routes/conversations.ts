import { Router } from "express";
import {
  getRecentHistory,
  clearConversation,
  memoryUnavailableMessage,
} from "../services/memoryService.js";

export const conversationsRouter = Router();

conversationsRouter.get("/:sessionId", async (req, res) => {
  try {
    const history = await getRecentHistory(req.params.sessionId, 100);
    res.json({ messages: history });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

conversationsRouter.delete("/:sessionId", async (req, res) => {
  try {
    await clearConversation(req.params.sessionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});
