import { Router } from "express";
import {
  listMemories,
  rememberFact,
  forgetMemoryById,
  clearAllMemories,
  isMemoryAvailable,
  memoryUnavailableMessage,
  deviceIdMissingMessage,
} from "../services/memoryService.js";

export const memoryRouter = Router();

memoryRouter.get("/", async (req, res) => {
  if (!isMemoryAvailable()) {
    return res.status(502).json({ error: memoryUnavailableMessage });
  }
  // No device id yet (e.g. very first request before the client has
  // finished writing it to localStorage): nothing to show, not an error.
  if (!req.deviceId) {
    return res.json({ memories: [] });
  }
  try {
    res.json({ memories: await listMemories(req.deviceId) });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

memoryRouter.post("/", async (req, res) => {
  if (!req.deviceId) {
    return res.status(400).json({ error: deviceIdMissingMessage });
  }
  try {
    const { category, key, value, importance } = req.body as {
      category?: string;
      key?: string;
      value?: string;
      importance?: number;
    };
    if (!category || !key || !value) {
      return res.status(400).json({ error: "category, key, and value are required" });
    }
    const memory = await rememberFact(req.deviceId, category, key, value, importance ?? 3);
    res.json({ memory });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

memoryRouter.delete("/all", async (req, res) => {
  if (!req.deviceId) {
    return res.status(400).json({ error: deviceIdMissingMessage });
  }
  try {
    await clearAllMemories(req.deviceId);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

memoryRouter.delete("/:id", async (req, res) => {
  if (!req.deviceId) {
    return res.status(400).json({ error: deviceIdMissingMessage });
  }
  try {
    await forgetMemoryById(req.deviceId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});
