import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      deviceId: string | null;
    }
  }
}

// A UUID (crypto.randomUUID() on the client) is the expected shape, but
// this only guards against garbage/oversized headers — it is not an
// authorization boundary. There is no authenticated user system in this
// app (see supabase/schema.sql), so a client-supplied device id is the
// only signal available for per-device memory isolation. It is trusted
// the same way a session cookie would be in a no-auth app: good enough to
// separate "this browser" from "that browser", not a security guarantee
// against a client that deliberately forges another device's id.
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function deviceIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const raw = req.header("x-device-id");
  req.deviceId = raw && DEVICE_ID_PATTERN.test(raw) ? raw : null;
  next();
}
