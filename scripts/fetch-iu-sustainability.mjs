// Pulls the next few events from IU's campus sustainability calendar (events.iu.edu/sustainiu)
// at build time and saves them as static content for the Events page.
//
// Source: IU's LiveWhale JSON feed for the group "Sustain IU" (public, no key needed).
// These are campus events, not Net Impact events, so they get their own section on the page
// and are left out of the Events structured data.
//
// If the feed is unreachable, empty or changes format, this writes an empty list and the page
// shows only the link to the full calendar. It never fails the build.
//
// Output: src/content/generated/iu-sustainability.json (read by src/lib/data.ts)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outJson = path.join(root, 'src/content/generated/iu-sustainability.json');

const BASE = (process.env.IU_EVENTS_BASE || 'https://events.iu.edu').replace(/\/$/, '');
const GROUP = process.env.IU_EVENTS_GROUP || 'Sustain IU'; // case-sensitive LiveWhale group name
const MAX_EVENTS = Number(process.env.IU_EVENTS_LIMIT || 3);
const TIMEOUT_MS = 10000;
const USER_AGENT = 'NetImpactIU-website-build (+https://github.com/Net-Impact-IU/website)';

const decode = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function normalize(items, now = new Date()) {
  return items
    .map((e) => {
      const start = toDate(e.date_iso || e.date_utc || e.date);
      const end = toDate(e.date2_iso || e.date2_utc || e.date2) || start;
      const url = typeof e.url === 'string' && /^https:\/\//.test(e.url) ? e.url : '';
      return {
        id: String(e.id ?? url),
        title: decode(e.title),
        location: decode(e.location || e.location_title),
        startUtc: start ? start.toISOString() : '',
        endUtc: end ? end.toISOString() : '',
        allDay: Boolean(e.is_all_day),
        url,
        canceled: Boolean(e.is_canceled),
      };
    })
    .filter((e) => e.title && e.url && e.startUtc && !e.canceled && new Date(e.endUtc) >= now)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
    .slice(0, MAX_EVENTS)
    .map(({ canceled, ...e }) => e);
}

async function main() {
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  const write = (events, note) => {
    fs.writeFileSync(outJson, JSON.stringify({ fetched_at: new Date().toISOString(), events }, null, 2));
    console.log(`IU sustainability calendar: ${note}`);
  };
  try {
    // The default feed leaves out location; ask for it, and fall back to the plain feed if that fails.
    const feed = `${BASE}/live/json/events/group/${encodeURIComponent(GROUP)}/`;
    let items = null;
    let lastError = null;
    for (const url of [`${feed}fields/location/`, feed]) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': USER_AGENT } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null;
        if (!items) throw new Error('unexpected response shape (no event list)');
        if (process.env.IU_EVENTS_DEBUG) console.log(`read ${url}`);
        break;
      } catch (e) {
        lastError = e;
        items = null;
      }
    }
    if (!items) throw lastError ?? new Error('no event list');
    if (process.env.IU_EVENTS_DEBUG && items[0]) console.log(`fields on first event: ${Object.keys(items[0]).join(', ')}`);
    const events = normalize(items);
    write(events, `${events.length} upcoming events saved (${items.length} in feed)`);
  } catch (e) {
    console.warn(`warning: IU sustainability calendar not read (${e.message})`);
    write([], 'none saved, Events page shows the calendar link only');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
