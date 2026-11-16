// Checks every link on the Resources page and reports any that look broken.
// Runs weekly on GitHub ("Check resource links" workflow). It never fails the site build:
// broken links show as warnings in the workflow summary so an officer can fix them in Pages CMS.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const page = JSON.parse(fs.readFileSync(path.join(root, 'src/content/pages/resources.json'), 'utf8'));
// Sites that block automated checks even when the page works in a browser.
const SKIP = [/linkedin\.com/, /careers\.netimpact\.org/]; // both checked in a browser Nov 2026

const links = [];
for (const s of page.sections) {
  for (const r of s.items) links.push({ name: r.name, url: r.url });
  if (s.more_url) links.push({ name: s.more_text || `${s.title} (see all)`, url: s.more_url });
}

const results = await Promise.all(
  links.map(async (l) => {
    if (SKIP.some((re) => re.test(l.url))) return { ...l, status: 'skipped', note: 'site blocks automated checks; open it by hand' };
    try {
      const res = await fetch(l.url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NetImpactIU-link-check; +https://github.com/Net-Impact-IU/website)', Accept: 'text/html,*/*' },
      });
      const moved = res.url && res.url.replace(/\/$/, '') !== l.url.replace(/\/$/, '') ? ` (now at ${res.url})` : '';
      if (res.ok) return { ...l, status: 'ok', note: moved };
      if (res.status === 403 || res.status === 429) return { ...l, status: 'check', note: `HTTP ${res.status}, may only block automated checks${moved}` };
      return { ...l, status: 'broken', note: `HTTP ${res.status}${moved}` };
    } catch (e) {
      return { ...l, status: 'broken', note: e.name === 'TimeoutError' ? 'no response in 20 seconds' : e.message };
    }
  }),
);

for (const r of results) {
  const line = `${r.status.padEnd(7)} ${r.name}: ${r.url}${r.note ? `  ${r.note}` : ''}`;
  if (r.status === 'broken' || r.status === 'check') console.log(`::warning title=Resources link (${r.status})::${line}`);
  else console.log(line);
}
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${results.length} links: ${count('ok')} ok, ${count('broken')} broken, ${count('check')} to check by hand, ${count('skipped')} skipped`);
