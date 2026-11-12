// Pulls Net Impact's upcoming events from beINvolved at build time and saves them as static content.
//
// Source 1 (default): the organization's public iCal feed.
// Source 2 (fallback): beINvolved's event search endpoint (undocumented, same data the site itself uses).
// No login, key or token is needed for either.
//
// If beINvolved is unreachable or the format changes, this writes an empty list and the
// Events page shows manual events plus a link to beINvolved. It never fails the build.
//
// Output: src/content/generated/beinvolved.json (read by src/lib/data.ts)
//
// Details and gotchas: README > Events from beINvolved.
import fs from 'node:fs';
import path from 'node:path';
import ICAL from 'ical.js';

const root = path.resolve(import.meta.dirname, '..');
const outJson = path.join(root, 'src/content/generated/beinvolved.json');

// ---- Config -------------------------------------------------------------------------------
const BASE = (process.env.BEINVOLVED_BASE || 'https://beinvolved.indiana.edu').replace(/\/$/, '');
const ORG_KEY = process.env.BEINVOLVED_ORG_KEY || 'netimpact'; // URL slug of the organization page
const ORG_ID = process.env.BEINVOLVED_ORG_ID || '133614';
const MAX_EVENTS = Number(process.env.BEINVOLVED_EVENT_LIMIT || 12);
const DESCRIPTION_LIMIT = 220;
const TIMEOUT_MS = 10000;
const USER_AGENT = 'NetImpactIU-website-build (+https://github.com/Net-Impact-IU/website)';

// This semester's general meeting room, set in the Site settings form. Used only to choose between duplicates.
let MEETING_ROOM = '';
try {
  MEETING_ROOM = JSON.parse(fs.readFileSync(path.join(root, 'src/content/settings/site.json'), 'utf8')).meeting_room || '';
} catch {}
const squash = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const inMeetingRoom = (e) => Boolean(MEETING_ROOM) && squash(e.location).includes(squash(MEETING_ROOM));

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const shorten = (s) => {
  const t = clean(s);
  if (t.length <= DESCRIPTION_LIMIT) return t;
  const cut = t.slice(0, DESCRIPTION_LIMIT);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---- Source 1: iCal -----------------------------------------------------------------------
function fromIcal(text) {
  const comp = new ICAL.Component(ICAL.parse(text));
  return comp.getAllSubcomponents('vevent').map((v) => {
    const start = v.getFirstPropertyValue('dtstart');
    const end = v.getFirstPropertyValue('dtend') || start;
    const rawDescription = String(v.getFirstPropertyValue('description') ?? '');
    const uid = String(v.getFirstPropertyValue('uid') ?? '');
    const link = `${rawDescription} ${uid}`.match(/https?:\/\/[^\s]+\/event\/(\d+)/);
    // The feed's description ends with a "Hosted by" line and the event link. Keep the text before them.
    const description = stripHtml(rawDescription)
      .split(/\n|\\n/)
      .filter((line) => !/^\s*hosted by\b/i.test(line) && !/https?:\/\//i.test(line))
      .join(' ');
    return {
      id: link ? link[1] : uid,
      title: clean(v.getFirstPropertyValue('summary')),
      description: shorten(description),
      location: clean(v.getFirstPropertyValue('location')),
      startUtc: start.toJSDate().toISOString(),
      endUtc: end.toJSDate().toISOString(),
      categories: v.getAllProperties('categories').flatMap((p) => p.getValues()).map(clean).filter(Boolean),
      url: link ? `${BASE}/event/${link[1]}` : `${BASE}/organization/${ORG_KEY}/events`,
      cancelled: clean(v.getFirstPropertyValue('status')).toUpperCase() === 'CANCELLED',
    };
  });
}

// ---- Source 2: event search (JSON) --------------------------------------------------------
function fromJson(text) {
  const body = JSON.parse(text);
  if (!Array.isArray(body?.value)) throw new Error('unexpected response shape (no "value" list)');
  return body.value
    .filter((e) => e.visibility === 'Public') // members-only events never go on the public site
    .map((e) => ({
      id: String(e.id),
      title: clean(e.name),
      description: shorten(stripHtml(e.description)),
      location: clean(e.location),
      startUtc: new Date(e.startsOn).toISOString(),
      endUtc: new Date(e.endsOn || e.startsOn).toISOString(),
      categories: (e.categoryNames || []).map(clean).filter(Boolean),
      url: `${BASE}/event/${e.id}`,
      cancelled: clean(e.status) !== 'Approved',
    }));
}

// ---- Normalize ----------------------------------------------------------------------------
export function normalize(events, now = new Date()) {
  const upcoming = events
    .filter((e) => e.title && !e.cancelled && !Number.isNaN(Date.parse(e.startUtc)) && new Date(e.endUtc) >= now)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc) || inMeetingRoom(b) - inMeetingRoom(a) || a.title.length - b.title.length);
  // beINvolved sometimes holds two entries for the same meeting (same start time).
  // Keep one: the entry in this semester's meeting room if there is one, otherwise the shorter title.
  const seen = new Set();
  const unique = upcoming.filter((e) => {
    const key = e.startUtc;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, MAX_EVENTS).map(({ cancelled, ...e }) => e);
}

async function main() {
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  const write = (events, source, note) => {
    fs.writeFileSync(outJson, JSON.stringify({ fetched_at: new Date().toISOString(), source, events }, null, 2));
    console.log(`beINvolved: ${note}`);
  };

  const sources = [
    { name: 'ical', url: `${BASE}/organization/${ORG_KEY}/events.ics`, parse: fromIcal },
    {
      name: 'json',
      url: `${BASE}/api/discovery/event/search?organizationIds[0]=${ORG_ID}&endsAfter=${encodeURIComponent(new Date().toISOString())}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=50&query=`,
      parse: fromJson,
    },
  ];
  for (const s of sources) {
    try {
      const raw = s.parse(await get(s.url));
      const events = normalize(raw);
      return write(events, s.name, `${events.length} upcoming events saved from the ${s.name} feed (${raw.length} in feed)`);
    } catch (e) {
      console.warn(`warning: beINvolved ${s.name} feed not read (${e.message})`);
    }
  }
  write([], 'none', 'no feed could be read, Events page falls back to manual events and a beINvolved link');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.warn(`warning: beINvolved events not updated (${e.message})`);
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, JSON.stringify({ fetched_at: new Date().toISOString(), source: 'none', events: [] }, null, 2));
  });
}
