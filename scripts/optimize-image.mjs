import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

const [, , source, destination, width = "240"] = process.argv;

if (!source || !destination || !/^\d+$/.test(width)) {
  throw new Error("Usage: node scripts/optimize-image.mjs <source> <destination> [width]");
}

await mkdir(dirname(destination), { recursive: true });
await sharp(source)
  .resize(Number(width), Number(width), { fit: "cover", position: "centre" })
  .webp({ quality: 82, effort: 6, smartSubsample: true })
  .toFile(destination);

