import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "../server/src/app.js";

/**
 * Vercel serverless entrypoint. Delegates directly to the shared Express
 * app (server/src/app.ts) — same routes, same middleware, same behavior
 * as local dev (server/src/index.ts), just without a persistent listener.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
