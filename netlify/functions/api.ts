import serverless from "serverless-http";
import { app } from "../../server/src/app.js";

/**
 * Netlify Functions entrypoint. Wraps the shared Express app (server/src/app.ts)
 * with serverless-http so it runs as a Lambda-compatible handler — same routes,
 * same middleware, same behavior as local dev (server/src/index.ts) and the
 * Vercel entrypoint (api/index.ts). No business logic is duplicated here.
 *
 * netlify.toml redirects /api/* to this function while preserving the
 * original request path (Netlify keeps `event.path` as the pre-redirect
 * URL), so the Express app's existing "/api/..." route mounts work
 * unchanged — no path-prefix stripping needed.
 *
 * `binary` tells serverless-http which response content-types must be
 * base64-encoded rather than treated as UTF-8 text — required for the TTS
 * endpoint's audio/wav responses. Without this, binary audio bytes get
 * corrupted in transit (verified: without it, isBase64Encoded came back
 * false on an audio/wav response).
 */
export const handler = serverless(app, {
  binary: ["audio/*", "application/octet-stream"],
});
