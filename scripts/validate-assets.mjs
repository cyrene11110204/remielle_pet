import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const skeletonPath = path.join(projectRoot, "spine", "Q蕾米.json");
const atlasPath = path.join(projectRoot, "spine", "leimi.atlas");
const requiredAnimations = ["a", "a_win", "b", "c", "d", "d_win", "e", "light"];

const skeleton = JSON.parse(await readFile(skeletonPath, "utf8"));
const version = String(skeleton.skeleton?.spine ?? "");

if (!version.startsWith("4.2")) {
  throw new Error(`Spine 数据版本应为 4.2，实际为 ${version || "未知"}`);
}

const missingAnimations = requiredAnimations.filter(
  (animation) => !Object.hasOwn(skeleton.animations ?? {}, animation)
);

if (missingAnimations.length > 0) {
  throw new Error(`缺少动画：${missingAnimations.join(", ")}`);
}

const atlas = await readFile(atlasPath, "utf8");
if (!atlas.includes("leimi.png")) {
  throw new Error("leimi.atlas 未引用 leimi.png");
}

await Promise.all([
  access(path.join(projectRoot, "spine", "leimi.png")),
  access(path.join(projectRoot, "spine", "read.png")),
  access(path.join(projectRoot, "vendor", "spine-player.min.js")),
  access(path.join(projectRoot, "vendor", "spine-player.min.css"))
]);

console.log(`Spine ${version} assets OK (${requiredAnimations.length} animations checked).`);
