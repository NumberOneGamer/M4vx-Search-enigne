import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..", ".open-next");

// ── Patch 1: Remove node:sqlite from handler.mjs ──
const handlerPath = join(root, "server-functions", "default", "handler.mjs");
if (existsSync(handlerPath)) {
  let content = readFileSync(handlerPath, "utf-8");
  if (content.includes("node:sqlite")) {
    content = content.replace(/"node:sqlite":\(\)=>require\("node:sqlite"\),?/g, "");
    content = content.replace(/require\("node:sqlite"\)/g, '(0,require)("node:sqlite")');
    writeFileSync(handlerPath, content, "utf-8");
    console.log("✓ Patched handler.mjs: removed node:sqlite");
  } else {
    console.log("¬ No node:sqlite refs in handler.mjs");
  }
} else {
  console.log("¬ handler.mjs not found");
}

// ── Patch 2: Serve static assets via env.ASSETS in worker.js ──
const workerPath = join(root, "worker.js");
if (existsSync(workerPath)) {
  let content = readFileSync(workerPath, "utf-8");
  // Inject static asset serving before the middleware handler call.
  // Pattern: `const reqOrResp = await middlewareHandler(request, env, ctx);`
  const assetServingCode = `
  // Serve static assets from Cloudflare Pages ASSETS binding
  const __url = new URL(request.url);
  if (__url.pathname.startsWith('/_next/') || __url.pathname === '/favicon.ico') {
    const __asset = env.ASSETS;
    if (__asset) {
      const __assetResponse = await __asset.fetch(request);
      if (__assetResponse.status !== 404) return __assetResponse;
    }
  }
`;
  content = content.replace(
    /const reqOrResp = await middlewareHandler\(request, env, ctx\);/,
    assetServingCode + "\n  const reqOrResp = await middlewareHandler(request, env, ctx);"
  );
  writeFileSync(workerPath, content, "utf-8");
  console.log("✓ Patched worker.js: added env.ASSETS static asset serving");
} else {
  console.log("¬ worker.js not found");
}

console.log("✔ All patches complete");
