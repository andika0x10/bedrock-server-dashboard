import "./lib/env";
import { startServer as startBedrock, stopServer, getServerStatus } from "./lib/serverProcess";
export { handler, options, startServer } from "@astrojs/node/server.js";

// This entry runs in the built Node server, never during `astro build`.
const starting = process.env.BEDROCK_AUTOSTART !== "false" ? startBedrock().catch((error) => console.error("Bedrock autostart gagal:", error.message)) : Promise.resolve();

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await starting;
  if (getServerStatus().running) await stopServer();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
