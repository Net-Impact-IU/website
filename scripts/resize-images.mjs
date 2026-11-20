// Makes smaller WebP copies of every uploaded photo so phones don't download full-size files.
//
// Reads:  public/images/uploads/**  (the photos officers upload through Pages CMS)
// Writes: public/images/_resized/** (WebP copies at several widths; not committed, rebuilt each deploy)
//         src/content/generated/images.json (which copies exist, read by src/lib/images.ts)
//
// Never stops the build: if a photo can't be read, it is skipped with a warning and the
// page simply uses the original file.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'public/images/uploads');
const OUT_DIR = path.join(ROOT, 'public/images/_resized');
const MANIFEST = path.join(ROOT, 'src/content/generated/images.json');
const WIDTHS = [320, 480, 800, 1200, 1800];
const QUALITY = 75;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function walk(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (EXTENSIONS.has(path.extname(e.name).toLowerCase())) files.push(full);
  }
  return files;
}

async function isFresh(out, srcMtime) {
  try {
    return (await fs.stat(out)).mtimeMs >= srcMtime;
  } catch {
    return false;
  }
}

const manifest = {};
let made = 0;
let reused = 0;
let skipped = 0;

for (const file of await walk(SRC_DIR)) {
  const rel = path.relative(SRC_DIR, file).split(path.sep).join('/');
  const key = `/images/uploads/${rel}`;
  try {
    const { mtimeMs } = await fs.stat(file);
    const meta = await sharp(file).metadata();
    const original = meta.autoOrient?.width ?? meta.width;
    if (!original) throw new Error('unknown width');
    const widths = WIDTHS.filter((w) => w < original);
    widths.push(Math.min(original, WIDTHS[WIDTHS.length - 1]));
    const stem = rel.replace(/\.[^.]+$/, '');
    const variants = [];
    for (const w of [...new Set(widths)].sort((a, b) => a - b)) {
      const outRel = `${stem}-${w}.webp`;
      const out = path.join(OUT_DIR, outRel);
      if (await isFresh(out, mtimeMs)) {
        reused++;
      } else {
        await fs.mkdir(path.dirname(out), { recursive: true });
        await sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
        made++;
      }
      variants.push({ w, src: `/images/_resized/${outRel}` });
    }
    manifest[key] = variants;
  } catch (err) {
    skipped++;
    console.warn(`[WARN] resize-images: skipped ${key} (${err.message}); the page will use the original file.`);
  }
}

await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`resize-images: ${Object.keys(manifest).length} photos, ${made} copies made, ${reused} reused, ${skipped} skipped.`);
