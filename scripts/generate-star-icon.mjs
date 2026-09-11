import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 256;
const SAMPLES = 4;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(scriptDirectory, "..", "assets", "remielle-star.png");

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crcTable = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function mix(start, end, amount) {
  return Math.round(start + (end - start) * amount);
}

function insideRoundedBox(x, y) {
  const left = 8;
  const top = 8;
  const right = 248;
  const bottom = 248;
  const radius = 68;
  const innerLeft = left + radius;
  const innerRight = right - radius;
  const innerTop = top + radius;
  const innerBottom = bottom - radius;

  if (x >= innerLeft && x <= innerRight && y >= top && y <= bottom) return true;
  if (y >= innerTop && y <= innerBottom && x >= left && x <= right) return true;

  const cornerX = x < innerLeft ? innerLeft : innerRight;
  const cornerY = y < innerTop ? innerTop : innerBottom;
  return Math.hypot(x - cornerX, y - cornerY) <= radius;
}

const STAR_POINTS = [
  [128, 65],
  [138, 113],
  [171, 126],
  [138, 139],
  [128, 187],
  [118, 139],
  [85, 126],
  [118, 113]
];

function insideFourPointStar(x, y) {
  let inside = false;
  for (let index = 0, previous = STAR_POINTS.length - 1; index < STAR_POINTS.length; previous = index, index += 1) {
    const [currentX, currentY] = STAR_POINTS[index];
    const [previousX, previousY] = STAR_POINTS[previous];
    const crosses = (currentY > y) !== (previousY > y);
    const boundaryX = ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;
    if (crosses && x < boundaryX) inside = !inside;
  }
  return inside;
}

function sampleColor(x, y) {
  if (!insideRoundedBox(x, y)) return [0, 0, 0, 0];
  if (insideFourPointStar(x, y)) return [255, 253, 255, 255];

  const amount = clamp((x + y - 16) / 480);
  const highlight = clamp(1 - Math.hypot(x - 58, y - 44) / 230);
  return [
    mix(244, 174, amount) + Math.round(highlight * 2),
    mix(130, 147, amount) + Math.round(highlight * 2),
    mix(190, 230, amount) + Math.round(highlight * 3),
    255
  ];
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y += 1) {
  const rowOffset = y * (SIZE * 4 + 1);
  raw[rowOffset] = 0;
  for (let x = 0; x < SIZE; x += 1) {
    const totals = [0, 0, 0, 0];
    for (let sampleY = 0; sampleY < SAMPLES; sampleY += 1) {
      for (let sampleX = 0; sampleX < SAMPLES; sampleX += 1) {
        const color = sampleColor(
          x + (sampleX + 0.5) / SAMPLES,
          y + (sampleY + 0.5) / SAMPLES
        );
        const alpha = color[3] / 255;
        totals[0] += color[0] * alpha;
        totals[1] += color[1] * alpha;
        totals[2] += color[2] * alpha;
        totals[3] += color[3];
      }
    }

    const sampleCount = SAMPLES * SAMPLES;
    const alpha = totals[3] / sampleCount;
    const offset = rowOffset + 1 + x * 4;
    raw[offset] = alpha ? Math.round(totals[0] / (sampleCount * alpha / 255)) : 0;
    raw[offset + 1] = alpha ? Math.round(totals[1] / (sampleCount * alpha / 255)) : 0;
    raw[offset + 2] = alpha ? Math.round(totals[2] / (sampleCount * alpha / 255)) : 0;
    raw[offset + 3] = Math.round(alpha);
  }
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8;
header[9] = 6;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, png);
console.log("Generated " + outputPath);
