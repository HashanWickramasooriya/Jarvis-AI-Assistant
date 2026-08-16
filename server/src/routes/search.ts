import { Router } from "express";
import { searchWeb, searchUnavailableMessage } from "../services/searchService.js";

export const searchRouter = Router();

searchRouter.get("/", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.status(400).json({ error: "q is required" });
    const results = await searchWeb(q);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : searchUnavailableMessage });
  }
});
