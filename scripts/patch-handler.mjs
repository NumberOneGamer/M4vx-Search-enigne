import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..", ".open-next");
const targets = [
  join(root, "server-functions", "default", "handler.mjs"),
  join(root, "worker.js"),
];

for (const filePath of targets) {
  if (!existsSync(filePath)) {
    console.log("¬ Skipped (not found):", filePath);
    continue;
  }
  let content = readFileSync(filePath, "utf-8");
  if (!content.includes("node:sqlite")) {
    console.log("¬ No node:sqlite refs in:", filePath);
    continue;
  }
  // 1. Remove the module registry entry for node:sqlite entirely.
  //    This is the lazy getter form: "node:sqlite":()=>require("node:sqlite")
  content = content.replace(/"node:sqlite":\(\)=>require\("node:sqlite"\),?/g, "");

  // 2. Replace any remaining bare require("node:sqlite") with indirect
  //    (0,require)("node:sqlite") so esbuild can't statically resolve it
  content = content.replace(/require\("node:sqlite"\)/g, '(0,require)("node:sqlite")');
  writeFileSync(filePath, content, "utf-8");
  console.log("✓ Patched:", filePath);
}
