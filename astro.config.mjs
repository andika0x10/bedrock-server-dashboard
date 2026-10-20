// @ts-check
import { defineConfig } from "astro/config";
import { createLogger } from "vite";

import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

const adapter = node({ mode: "standalone" });
const configureNode = adapter.hooks["astro:config:done"];
adapter.hooks["astro:config:done"] = (/** @type {Parameters<NonNullable<import('astro').AstroIntegration['hooks']['astro:config:done']>>[0]} */ context) =>
  configureNode?.({
    ...context,
    setAdapter: (nodeAdapter) =>
      context.setAdapter({
        ...nodeAdapter,
        serverEntrypoint: new URL("./src/server-entry.mjs", import.meta.url).pathname,
      }),
  });

const logger = createLogger();
const originalWarn = logger.warn;

/** @type {typeof logger.warn} */
const filteredWarn = (msg, options) => {
  if (typeof msg === "string") {
    const isAstroUnusedExternalImportWarning =
      msg.includes('"matchHostname", "matchPathname", "matchPort" and "matchProtocol"') && msg.includes("@astrojs/internal-helpers/remote");

    const isAstroNodeExternalizationWarning =
      msg.includes('Module "') &&
      msg.includes("externalized for browser compatibility") &&
      (msg.includes("node_modules/@astrojs/node/") ||
        msg.includes("node_modules/astro/dist/core/app/node.js") ||
        msg.includes("node_modules/send/index.js") ||
        msg.includes("node_modules/etag/index.js") ||
        msg.includes("node_modules/mime-types/index.js") ||
        msg.includes("node_modules/on-finished/index.js"));

    if (isAstroUnusedExternalImportWarning || isAstroNodeExternalizationWarning) {
      return;
    }
  }

  originalWarn(msg, options);
};

logger.warn = filteredWarn;

// https://astro.build/config
export default defineConfig({
  output: "server",

  security: {
    checkOrigin: false,
  },

  vite: {
    customLogger: logger,
    plugins: [tailwindcss()],
  },

  adapter,
});
