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

if (packageJson.version !== "0.2.0") throw new Error("release2 version must be 0.2.0");
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
if (rendererScript.includes("event.screenX") || rendererScript.includes("event.screenY")) {
  throw new Error("Renderer drag must not use window-relative screen coordinates");
}
if (!mainScript.includes("screen.getCursorScreenPoint()") || mainScript.includes("point.x - dragState.pointerX")) {
  throw new Error("Window drag must use absolute OS cursor coordinates from the main process");
}
if (!preloadScript.includes('moveDrag: () => ipcRenderer.send("window:drag-move")')) {
  throw new Error("Preload drag API must not accept accumulated pointer coordinates");
}
const gazeX = Number(rendererScript.match(/GAZE_OFFSET_X\s*=\s*(\d+)/)?.[1]);
const gazeY = Number(rendererScript.match(/GAZE_OFFSET_Y\s*=\s*(\d+)/)?.[1]);
if (!Number.isFinite(gazeX) || !Number.isFinite(gazeY) || gazeX > 10 || gazeY > 7) {
  throw new Error(`Gaze range is too large: ${gazeX} x ${gazeY}`);
}

const releaseHash = "A7E011C2DCF808C8F72A301489D5D3A91604403D6D846DBE8402878A4C114DA0";
const releaseBytes = await readFile(
  path.join(projectRoot, "release2", "Remielle-Pet-release2-0.2.0-x64.exe")
);
const actualReleaseHash = createHash("sha256").update(releaseBytes).digest("hex").toUpperCase();
if (actualReleaseHash !== releaseHash) {
  throw new Error(`release2 EXE hash mismatch: ${actualReleaseHash}`);
}
const sourceLine = "Spine 动画素材来源：[Bilibili BV1NAKN6MEHi](https://www.bilibili.com/video/BV1NAKN6MEHi)。";
for (const [name, document] of [["README.md", readme], ["EXE使用说明.md", exeGuide]]) {
  if (document.length < 500) throw new Error(`${name} is unexpectedly empty`);
  if (!document.includes("备忘框大小")) throw new Error(`${name} does not explain memo scaling`);
  if (!document.includes(releaseHash)) throw new Error(`${name} does not contain the release hash`);
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
  "release/Remielle-Pet-0.1.0-x64.exe",
  "release2/Remielle-Pet-release2-0.2.0-x64.exe"
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

console.log("Release2 source, settings, memo scale, gaze range, icon, docs, EXEs, and preserved v1 files OK.");