import type { APIRoute } from "astro";
import { exportWorld } from "../../../lib/packWorldManager";
import { errorResponse } from "../../../lib/http";
export const GET: APIRoute = async ({ url }) => {
  try {
    const name = url.searchParams.get("name") ?? "";
    const archive = await exportWorld(name);
    return new Response(new Uint8Array(archive), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="world.mcworld"; filename*=UTF-8''${encodeURIComponent(name)}.mcworld`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "World gagal diunduh.", 400);
  }
};
