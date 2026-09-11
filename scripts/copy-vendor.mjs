import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const packageRoot = path.join(
  projectRoot,
  "node_modules",
  "@esotericsoftware",
  "spine-player"
);
const vendorDirectory = path.join(projectRoot, "vendor");

const files = [
  ["dist/iife/spine-player.min.js", "spine-player.min.js"],
  ["dist/spine-player.min.css", "spine-player.min.css"]
];

await mkdir(vendorDirectory, { recursive: true });

for (const [sourceRelative, targetName] of files) {
  const source = path.join(packageRoot, ...sourceRelative.split("/"));
  await access(source);
  await copyFile(source, path.join(vendorDirectory, targetName));
}

console.log("Spine Player 4.2 runtime copied to vendor/.");
