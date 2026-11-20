// Looks up the smaller WebP copies made by scripts/resize-images.mjs.
// If the copies are missing (script didn't run, new photo, error), returns undefined and
// pages fall back to the original file, so nothing breaks.

import fs from 'node:fs';
import path from 'node:path';
import { url } from './url';

type Variant = { w: number; src: string };

let manifest: Record<string, Variant[]> | null = null;

function load(): Record<string, Variant[]> {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/generated/images.json'), 'utf8'));
  } catch {
    manifest = {};
  }
  return manifest!;
}

/** WebP srcset for an uploaded photo path like "/images/uploads/home/x.jpg", or undefined. */
export function webpSrcset(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const variants = load()[src];
  if (!variants || variants.length === 0) return undefined;
  return variants.map((v) => `${url(v.src)} ${v.w}w`).join(', ');
}
