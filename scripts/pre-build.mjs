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

// Inject static asset serving before the middlewareHandler call
// => `/cdn-cgi/image/` case stays, but `/_next/*`, `/_next/static/*`, `/favicon.ico`
//    get served directly from env.ASSETS before reaching middleware.
const assetServing = `
            // Serve static assets from Cloudflare Pages ASSETS binding
            // (Required in Advanced Mode: the worker must explicitly serve static files)
            const __url = new URL(request.url);
            if (__url.pathname.startsWith("/_next/") || __url.pathname === "/favicon.ico") {
                const __asset = env.ASSETS;
                if (__asset) {
                    const __assetResponse = await __asset.fetch(request);
                    if (__assetResponse.status !== 404) return __assetResponse;
                }
            }
`;

code = code.replace(
  "const reqOrResp = await middlewareHandler(request, env, ctx);",
  assetServing + "            const reqOrResp = await middlewareHandler(request, env, ctx);"
);

writeFileSync(template, code, "utf-8");
console.log("✓ Patched worker template: added env.ASSETS static asset serving");
