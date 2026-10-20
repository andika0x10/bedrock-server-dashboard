import type { APIRoute } from "astro";
import { readServerSettings } from "../../../lib/serverProperties";
import { listPacks, listWorlds } from "../../../lib/packWorldManager";
import { getServerLogs, getServerStatus } from "../../../lib/serverProcess";
import { getSystemMetrics } from "../../../lib/systemMetrics";
import { jsonResponse, errorResponse } from "../../../lib/http";
import { listPlayersByDuration } from "../../../lib/playerStats";
export const GET: APIRoute = async () => {
  try {
    const [settings, worlds, packs] = await Promise.all([readServerSettings(), listWorlds(), listPacks()]);
    return jsonResponse({ ok: true, settings, worlds, packs, players: listPlayersByDuration(), status: getServerStatus(), metrics: getSystemMetrics(), logs: getServerLogs(8) });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Ringkasan tidak dapat dimuat.", 500);
  }
};
