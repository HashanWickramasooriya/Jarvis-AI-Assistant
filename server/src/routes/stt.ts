import { Router } from "express";
import multer from "multer";
import { transcribeAudio, sttUnavailableMessage } from "../services/speechService.js";

export const sttRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

sttRouter.post("/", upload.single("audio"), async (req, res) => {
  console.log("[STT] request received");

  if (!req.file) {
    console.log("[STT] no file in request");
    return res.status(400).json({ error: "audio file is required" });
  }

  console.log(`[STT] file received (mime type: ${req.file.mimetype || "unknown"})`);
  console.log(`[STT] file size: ${req.file.size} bytes`);

  if (req.file.size === 0) {
    console.log("[STT] rejected: empty file");
    return res.status(400).json({ error: "No audio was captured. Please try again." });
  }
  // A well-formed webm/ogg/mp4 container header alone is at least a few
  // hundred bytes; anything smaller is effectively silence/noise, not a
  // usable recording.
  if (req.file.size < 500) {
    console.log("[STT] rejected: recording too short");
    return res.status(400).json({ error: "Recording was too short. Please speak for a moment after pressing the mic." });
  }

  try {
    console.log("[STT] sending to Groq");
    const text = await transcribeAudio(req.file.buffer, req.file.originalname, req.file.mimetype);
    console.log("[STT] transcription received");
    res.json({ text });
  } catch (err) {
    // speechService already sanitizes provider errors before throwing, so
    // this message is always safe to forward as-is.
    const message = err instanceof Error ? err.message : sttUnavailableMessage;
    console.error("[STT] transcription failed:", message);
    res.status(502).json({ error: message });
  }
});
