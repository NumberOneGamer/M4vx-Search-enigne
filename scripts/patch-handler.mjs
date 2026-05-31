import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", ".open-next");

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

// ── Patch 2: Generate _routes.json ──
// Exclude static assets from the Advanced Mode worker so Cloudflare CDN serves them directly.
// The OpenNext build puts assets at the root of the output directory on CI (Linux),
// so `/_next/static/*` maps directly to files in the output directory.
const routesPath = join(root, "_routes.json");
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/_next/image*",
    "/favicon.ico",
    "/favicon*",
    "/robots.txt",
    "/sitemap.xml",
  ],
};
writeFileSync(routesPath, JSON.stringify(routes, null, 2), "utf-8");
console.log("✓ Created _routes.json: static assets excluded from worker");

// ── Patch 3: Copy worker.js → _worker.js for Advanced Mode ──
const workerPath = join(root, "worker.js");
const workerDest = join(root, "_worker.js");
if (existsSync(workerPath)) {
  copyFileSync(workerPath, workerDest);
  console.log("✓ Copied worker.js → _worker.js");
} else {
  console.log("¬ worker.js not found");
}

console.log("✔ All patches complete");
