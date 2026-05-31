import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Patches the OpenNext worker template to serve static assets via env.ASSETS
// before calling the middleware handler. This is necessary because Cloudflare
// Pages Advanced Mode requires the worker to explicitly serve static assets.
const __dirname = dirname(fileURLToPath(import.meta.url));
const template = join(
  __dirname, "..", "node_modules", "@opennextjs",
  "cloudflare", "dist", "cli", "templates", "worker.js"
);

let code = readFileSync(template, "utf-8");

// Skip if already patched
if (code.includes("ASSETS.fetch")) {
  console.log("¬ Worker template already patched");
  process.exit(0);
}

// Inject static asset serving before the middlewareHandler call.
// The OpenNext build puts static assets in the 'assets/' subdirectory of the
// output, so we must map /_next/* => /assets/_next/* when calling env.ASSETS.fetch().
// A direct-path fallback is included for builds that put assets at the root level.
const assetServing = `
            const __url = new URL(request.url);
            if (__url.pathname.startsWith("/_next/") || __url.pathname === "/favicon.ico") {
                const __asset = env.ASSETS;
                if (__asset) {
                    try {
                        const __origPath = __url.pathname;
                        // OpenNext puts assets under 'assets/' — map path accordingly
                        __url.pathname = "/assets" + __origPath;
                        let __resp = await __asset.fetch(new Request(__url, request));
                        if (__resp.status !== 404) return __resp;
                        // Fallback: try direct path (for builds at root level)
                        __url.pathname = __origPath;
                        __resp = await __asset.fetch(new Request(__url, request));
                        if (__resp.status !== 404) return __resp;
                    } catch (e) {
                        // Ignore — fall through to middleware
                    }
                }
            }
`;

code = code.replace(
  "const reqOrResp = await middlewareHandler(request, env, ctx);",
  assetServing + "            const reqOrResp = await middlewareHandler(request, env, ctx);"
);

writeFileSync(template, code, "utf-8");
console.log("✓ Patched worker template: added env.ASSETS static asset serving");
