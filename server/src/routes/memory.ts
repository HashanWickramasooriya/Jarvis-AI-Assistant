import { Router } from "express";
import {
  listMemories,
  rememberFact,
  forgetMemoryById,
  clearAllMemories,
  isMemoryAvailable,
  memoryUnavailableMessage,
} from "../services/memoryService.js";

export const memoryRouter = Router();

memoryRouter.get("/", async (_req, res) => {
  if (!isMemoryAvailable()) {
    return res.status(502).json({ error: memoryUnavailableMessage });
  }
  try {
    res.json({ memories: await listMemories() });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

memoryRouter.post("/", async (req, res) => {
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
    const memory = await rememberFact(category, key, value, importance ?? 3);
    res.json({ memory });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

memoryRouter.delete("/all", async (_req, res) => {
  try {
    await clearAllMemories();
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

memoryRouter.delete("/:id", async (req, res) => {
  try {
    await forgetMemoryById(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});
