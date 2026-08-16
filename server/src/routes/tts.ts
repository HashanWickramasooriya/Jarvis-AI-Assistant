import { Router } from "express";
import { synthesizeSpeech, ttsUnavailableMessage } from "../services/ttsService.js";

export const ttsRouter = Router();

ttsRouter.post("/", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });
    const audio = await synthesizeSpeech(text);
    res.setHeader("Content-Type", "audio/wav");
    res.send(audio);
  } catch (err) {
    const message = err instanceof Error ? err.message : ttsUnavailableMessage;
    res.status(502).json({ error: message });
  }
});
