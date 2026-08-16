import { Router } from "express";
import { listPreferences, setPreference, isPreferencesAvailable } from "../services/preferencesService.js";
import { memoryUnavailableMessage } from "../services/memoryService.js";

export const preferencesRouter = Router();

preferencesRouter.get("/", async (_req, res) => {
  if (!isPreferencesAvailable()) {
    return res.status(502).json({ error: memoryUnavailableMessage });
  }
  try {
    res.json({ preferences: await listPreferences() });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});

preferencesRouter.post("/", async (req, res) => {
  try {
    const { key, value } = req.body as { key?: string; value?: string };
    if (!key || value === undefined) {
      return res.status(400).json({ error: "key and value are required" });
    }
    await setPreference(key, String(value));
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : memoryUnavailableMessage });
  }
});
