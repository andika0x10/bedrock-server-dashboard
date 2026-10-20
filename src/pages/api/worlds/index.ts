import type { APIRoute } from "astro";
import { errorResponse, jsonResponse } from "../../../lib/http";
import { activateWorld, createWorld, deleteWorld, listWorlds, uploadWorld } from "../../../lib/packWorldManager";

export const GET: APIRoute = async () => {
  return jsonResponse({ ok: true, worlds: await listWorlds() });
};

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return errorResponse("File world tidak ditemukan.", 400);
      }

      const result = await uploadWorld(file);
      return jsonResponse({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload world gagal.";
      return errorResponse(message, 400);
    }
  }

  try {
    const payload = (await request.json()) as { action?: string; settings?: Parameters<typeof createWorld>[0]; worldName?: string };
    if (payload.action === "create") {
      if (!payload.settings || typeof payload.settings !== "object") return errorResponse("Pengaturan world wajib diisi.", 400);
      return jsonResponse({ ok: true, worlds: await createWorld(payload.settings) });
    }
    const worldName = payload.worldName?.trim() ?? "";
    if (!worldName) {
      return errorResponse("worldName wajib diisi.", 400);
    }

    const worlds = await activateWorld(worldName);
    return jsonResponse({ ok: true, worlds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengaktifkan world.";
    return errorResponse(message, 400);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const payload = (await request.json()) as { worldName?: string };
    const worldName = payload.worldName?.trim() ?? "";
    if (!worldName) {
      return errorResponse("worldName wajib diisi.", 400);
    }

    const worlds = await deleteWorld(worldName);
    return jsonResponse({ ok: true, worlds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus world.";
    return errorResponse(message, 400);
  }
};
