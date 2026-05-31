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
  // Replace static require("node:sqlite") with string concatenation to prevent
  // esbuild (Wrangler) from statically resolving it at bundle time.
  // Runtime behavior is identical – strings concat before require.
  content = content.replace(/require\("node:sqlite"\)/g, 'require("nod"+"e:sqlite")');
  writeFileSync(filePath, content, "utf-8");
  console.log("✓ Patched:", filePath);
}
