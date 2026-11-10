// Content checks that run before every build. A failure stops the deploy and
// the error message says which form and field to fix.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const errors = [];
const warn = [];
const imgExists = (p) => !p || fs.existsSync(path.join(root, 'public', p));

const site = read('src/content/settings/site.json');
for (const k of ['chapter_name', 'email', 'join_url']) if (!site[k]) errors.push(`Site settings: "${k}" is empty`);

const { officers } = read('src/content/settings/officers.json');
officers.forEach((o, i) => {
  if (!o.name || !o.role) errors.push(`Officers #${i + 1}: name and role are required`);
  if (o.photo && !imgExists(o.photo)) errors.push(`Officers: ${o.name}'s headshot file is missing (${o.photo})`);
  if (o.photo && !o.photo_alt) warn.push(`Officers: ${o.name} has a headshot but no photo description`);
});

const { photos } = read('src/content/settings/gallery.json');
photos.forEach((p) => {
  if (p.image && !imgExists(p.image)) errors.push(`Photo gallery: file missing for "${p.caption}" (${p.image})`);
  if (p.image && !p.alt) errors.push(`Photo gallery: "${p.caption}" needs a photo description`);
});

for (const f of fs.readdirSync(path.join(root, 'src/content/pages'))) {
  const page = read(`src/content/pages/${f}`);
  if (page.seo_title && page.seo_title.length > 65) warn.push(`Page text (${f}): Google title is ${page.seo_title.length} characters; aim for under 60`);
  if (page.seo_description && page.seo_description.length > 165) warn.push(`Page text (${f}): Google description is ${page.seo_description.length} characters; aim for under 160`);
}

warn.forEach((w) => console.warn(`warning: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`error: ${e}`));
  process.exit(1);
}
console.log(`Content check passed (${officers.length} officers, ${photos.filter((p) => p.image).length} gallery photos).`);
