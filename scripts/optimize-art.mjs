import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const [portal, island] = process.argv.slice(2);
if (!portal || !island)
  throw new Error("Usage: node scripts/optimize-art.mjs portal.png island.png");
await mkdir("public/art", { recursive: true });
const metadata = await sharp(portal).metadata();
if (!metadata.hasAlpha)
  throw new Error("Le portail doit avoir un véritable fond transparent.");
await sharp(portal)
  .resize({ width: 600, height: 800, fit: "inside", withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile("public/art/portal.webp");
await sharp(island)
  .resize({ width: 800, height: 600, fit: "cover", withoutEnlargement: true })
  .webp({ quality: 88 })
  .toFile("public/art/one-piece-island.webp");
