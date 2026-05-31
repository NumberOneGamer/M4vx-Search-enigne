import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const handlerPath = join(import.meta.dirname, "..", ".open-next", "server-functions", "default", "handler.mjs");

if (!existsSync(handlerPath)) {
  console.error("handler.mjs not found at", handlerPath);
  process.exit(0); // soft exit – build might still work
}

let content = readFileSync(handlerPath, "utf-8");
// Remove the node:sqlite entry from the module registry
content = content.replace(/"node:sqlite":\(\)=>require\("node:sqlite"\),?/g, "");
writeFileSync(handlerPath, content, "utf-8");
console.log("✓ Patched handler.mjs: removed node:sqlite reference");
