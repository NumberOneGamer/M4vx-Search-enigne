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
// We do NOT exclude /_next/* or /favicon.ico here because OpenNext puts assets
// in an `assets/` subdirectory, so the CDN can't find them at the expected path.
// Instead, the worker (patched by pre-build.mjs) handles them via env.ASSETS.fetch()
// with correct path mapping (/assets/ prefix).
const routesPath = join(root, "_routes.json");
const routes = {
  version: 1,
  include: ["/*"],
  exclude: [],
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
