import { Router } from "express";
import { capabilities } from "../env.js";

export const statusRouter = Router();

// Deliberately provider-neutral: never leak the underlying AI/STT/TTS
// vendor or model identifier to the client. Only abstract capability
// states are reported.
statusRouter.get("/", (_req, res) => {
  res.json({
    ai: capabilities.ai ? "online" : "offline",
    stt: capabilities.stt ? "ready" : "offline",
    tts: capabilities.tts ? "ready" : "offline",
    memory: capabilities.memory ? "online" : "offline",
    search: capabilities.search ? "online" : "offline",
    network: "online",
  });
});
