import { app } from "./app.js";
import { env } from "./env.js";

// Local dev / traditional-hosting entrypoint. Vercel deployments use
// /api/index.ts instead, which imports `app` directly without listening
// on a port.
app.listen(env.PORT, () => {
  console.log(`J.A.R.V.I.S. backend online at http://localhost:${env.PORT}`);
});
