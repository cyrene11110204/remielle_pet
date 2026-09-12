import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const readProjectFile = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");

const [
  skeletonText,
  packageText,
  mainScript,
  preloadScript,
  rendererHtml,
  rendererScript,
  rendererStyles,
  preferencesScript,
  readme,
  exeGuide
] = await Promise.all([
  readProjectFile("spine/Q蕾米.json"),
  readProjectFile("package.json"),
  readProjectFile("src/main/main-v2.cjs"),
  readProjectFile("src/main/preload-v2.cjs"),
  readProjectFile("src/renderer/index-v2.html"),
  readProjectFile("src/renderer/renderer-v2.js"),
  readProjectFile("src/renderer/styles-v2.css"),
  readProjectFile("src/shared/preferences-store.js"),
  readProjectFile("README.md"),
  readProjectFile("EXE使用说明.md")
]);
const skeleton = JSON.parse(skeletonText);
const packageJson = JSON.parse(packageText);

const boneNames = new Set((skeleton.bones ?? []).map(({ name }) => name));
for (const bone of ["眼_瞳孔_微动", "眼_瞳孔L_微动"]) {
  if (!boneNames.has(bone)) throw new Error(`Missing gaze bone: ${bone}`);
}

if (packageJson.version !== "0.2.2") throw new Error("release2 bugfix version must be 0.2.2");
if (packageJson.main !== "src/main/main-v2.cjs") throw new Error("release2 main entry is incorrect");
if (packageJson.build?.directories?.output !== "release2") {
  throw new Error("release2 output directory is incorrect");
}
if (packageJson.build?.win?.icon !== "assets/remielle-star.png") {
  throw new Error("release2 must use the pink star icon");
}

for (const selector of ['id="settings-button"', 'id="pet-size"', 'id="bubble-size"']) {
  if (!rendererHtml.includes(selector)) throw new Error(`Missing settings control: ${selector}`);
}
if (!preferencesScript.includes("bubbleScale: 100")) {
  throw new Error("Missing persisted memo scale preference");
}
if (!rendererScript.includes("--bubble-scale") || !rendererScript.includes("--bubble-offset-y")) {
  throw new Error("Memo scale or compact layout offset is not applied");
}
if (!rendererStyles.includes("translate3d(0, var(--bubble-offset-y), 0)")) {
  throw new Error("Memo and pet spacing is not controlled by one stable transform");
}
if (!rendererHtml.includes('id="pet-drag-region"')) {
  throw new Error("Missing native whole-window pet drag region");
}
if (!rendererStyles.includes(".pet-drag-region") || !rendererStyles.includes("-webkit-app-region: drag")) {
  throw new Error("Pet dragging must use Electron's native draggable window region");
}
for (const source of [mainScript, preloadScript, rendererScript]) {
  if (source.includes("window:drag-start") || source.includes("window:drag-move")) {
    throw new Error("Legacy frame-by-frame window dragging must not return");
  }
}
for (const source of [mainScript, preloadScript, rendererScript]) {
  if (source.includes("setIgnoreMouseEvents") || source.includes("setMousePassthrough")) {
    throw new Error("release2 must not dynamically disable mouse input");
  }
}
if (!rendererStyles.includes("top: 96px")) {
  throw new Error("Pet drag region must stay below the memo interaction area");
}
if (!mainScript.includes("screen.getCursorScreenPoint()")) {
  throw new Error("Main process cursor sampling is required for gaze and hover tracking");
}
const gazeX = Number(rendererScript.match(/GAZE_OFFSET_X\s*=\s*(\d+)/)?.[1]);
const gazeY = Number(rendererScript.match(/GAZE_OFFSET_Y\s*=\s*(\d+)/)?.[1]);
if (!Number.isFinite(gazeX) || !Number.isFinite(gazeY) || gazeX > 10 || gazeY > 7) {
  throw new Error(`Gaze range is too large: ${gazeX} x ${gazeY}`);
}

const releaseArtifact = "Remielle-Pet-release2-" + packageJson.version + "-x64.exe";
let releaseHash = null;
try {
  const releaseBytes = await readFile(path.join(projectRoot, "release2", releaseArtifact));
  releaseHash = createHash("sha256").update(releaseBytes).digest("hex").toUpperCase();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const sourceLine = "Spine 动画素材来源：[Bilibili BV1NAKN6MEHi](https://www.bilibili.com/video/BV1NAKN6MEHi)。";
for (const [name, document] of [["README.md", readme], ["EXE使用说明.md", exeGuide]]) {
  if (document.length < 500) throw new Error(`${name} is unexpectedly empty`);
  if (!document.includes("备忘框大小")) throw new Error(`${name} does not explain memo scaling`);
  if (releaseHash && !document.includes(releaseHash)) {
    throw new Error(name + " does not contain the current release hash");
  }
  if (!document.includes(sourceLine)) throw new Error(`${name} does not contain the requested source line`);
  if (document.includes("感谢")) throw new Error(`${name} contains an unwanted thank-you statement`);
}

const requiredFiles = [
  "src/main/main.cjs",
  "src/main/main-v2.cjs",
  "src/main/preload-v2.cjs",
  "src/renderer/index.html",
  "src/renderer/index-v2.html",
  "src/renderer/renderer-v2.js",
  "src/renderer/styles-v2.css",
  "src/shared/preferences-store.js",
  "assets/remielle-star.svg",
  "assets/remielle-star.png",
  "release/Remielle-Pet-0.1.0-x64.exe"
];
await Promise.all(requiredFiles.map(async (relativePath) => {
  const fileInfo = await stat(path.join(projectRoot, relativePath));
  if (!fileInfo.isFile() || fileInfo.size === 0) throw new Error(`Missing or empty file: ${relativePath}`);
}));

await Promise.all([
  "docs/features/settings-and-customization.md",
  "docs/features/feedback-effects.md",
  "docs/features/gaze-and-drag.md",
  "docs/features/build-and-release2.md"
].map((relativePath) => access(path.join(projectRoot, relativePath))));

console.log(
  releaseHash
    ? "Release2 source and " + releaseArtifact + " (" + releaseHash + ") are valid."
    : "Release2 source is valid; " + releaseArtifact + " has not been built yet."
);
