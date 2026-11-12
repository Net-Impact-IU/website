import { getCollection } from 'astro:content';
import site from '../content/settings/site.json';
import officers from '../content/settings/officers.json';
import impact from '../content/settings/impact.json';
import faq from '../content/settings/faq.json';
import gallery from '../content/settings/gallery.json';
import testimonials from '../content/settings/testimonials.json';

export { site, officers, impact, faq, gallery, testimonials };

export const TIME_ZONE = 'America/Indiana/Indianapolis';
export const BEINVOLVED_ORG_URL = 'https://beinvolved.indiana.edu/organization/netimpact';
export const BEINVOLVED_ICAL_URL = `${BEINVOLVED_ORG_URL}/events.ics`;

/** One event as the site shows it, whether it was typed into the Events form or came from beINvolved. */
export type SiteEvent = {
  title: string;
  sort: number; // start time in ms, for ordering
  month: string;
  day: string;
  long: string; // "Monday, November 16, 2026"
  time: string; // "7:05 to 8:05 pm"
  location: string;
  description: string;
  link: string;
  linkLabel: string;
  featured: boolean;
  calendarUrl: string; // "Add to Google Calendar" link
  startIso: string; // for Google structured data
  endIso?: string;
};

function dateParts(d: Date, timeZone: string) {
  return {
    month: d.toLocaleString('en-US', { timeZone, month: 'short' }),
    day: d.toLocaleString('en-US', { timeZone, day: 'numeric' }),
    long: d.toLocaleString('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

/** "7:05 to 8:05 pm" or "11:30 am to 1:00 pm", always in Indiana time (beINvolved sends UTC). */
function timeRange(start: Date, end: Date) {
  const parts = (d: Date) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d);
    const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
    return { clock: `${get('hour')}:${get('minute')}`, period: get('dayPeriod').toLowerCase() };
  };
  const s = parts(start);
  const e = parts(end);
  if (end.getTime() <= start.getTime()) return `${s.clock} ${s.period}`;
  return s.period === e.period ? `${s.clock} to ${e.clock} ${e.period}` : `${s.clock} ${s.period} to ${e.clock} ${e.period}`;
}

/** Standard Google Calendar "add event" link. Times are UTC (ends in Z); form events with no time are all-day. */
function googleCalendarUrl(e: { title: string; start: Date; end?: Date; location: string; details: string }) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const dates = e.end ? `${stamp(e.start)}/${stamp(e.end)}` : `${day(e.start)}/${day(new Date(e.start.getTime() + 86400000))}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, location: e.location, details: e.details });
  return `https://calendar.google.com/calendar/render?${q}`;
}

type FeedEvent = { id: string; title: string; description: string; location: string; startUtc: string; endUtc: string; categories: string[]; url: string };
// Written by scripts/fetch-beinvolved.mjs during the build; missing locally unless you run it.
const feedFiles = import.meta.glob<{ default: { events: FeedEvent[] } }>('../content/generated/beinvolved.json', { eager: true });

/** Upcoming events from beINvolved (already filtered to public, not cancelled, no duplicates). */
export function beinvolvedEvents(now = new Date()): SiteEvent[] {
  const events = Object.values(feedFiles)[0]?.default.events ?? [];
  return events
    .filter((e) => new Date(e.endUtc) >= now)
    .map((e) => {
      const start = new Date(e.startUtc);
      const end = new Date(e.endUtc);
      return {
        title: e.title,
        sort: start.getTime(),
        ...dateParts(start, TIME_ZONE),
        time: timeRange(start, end),
        location: e.location,
        description: e.description,
        link: e.url,
        linkLabel: 'Details',
        featured: false,
        calendarUrl: googleCalendarUrl({ title: e.title, start, end, location: e.location, details: [e.description, e.url].filter(Boolean).join('\n\n') }),
        startIso: e.startUtc,
        endIso: e.endUtc,
      };
    });
}

/**
 * Upcoming events, soonest first: events typed into the Events form plus the beINvolved feed.
 * Past events drop off on the next build (daily).
 */
export async function upcomingEvents(): Promise<SiteEvent[]> {
  const all = await getCollection('events');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const manual: SiteEvent[] = all
    .filter((e) => e.data.date >= today)
    .map((e) => ({
      title: e.data.title,
      sort: e.data.date.getTime(),
      ...dateParts(e.data.date, 'UTC'), // form dates have no time, so read them as the calendar day typed in
      time: e.data.time,
      location: e.data.location,
      description: e.data.description,
      link: e.data.signup_url,
      linkLabel: 'Sign up',
      featured: e.data.featured,
      calendarUrl: googleCalendarUrl({ title: e.data.title, start: e.data.date, location: e.data.location, details: [e.data.time, e.data.description].filter(Boolean).join('\n\n') }),
      startIso: e.data.date.toISOString().slice(0, 10),
    }));
  return [...manual, ...beinvolvedEvents()].sort((a, b) => a.sort - b.sort);
}

export async function publishedPosts() {
  const all = await getCollection('blog');
  return all
    .filter((p) => p.data.published)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function approvedProjects() {
  const all = await getCollection('projects');
  return all.filter((p) => p.data.client_approved);
}

export const galleryPhotos = () => gallery.photos.filter((p) => p.image);
export const publishedTestimonials = () =>
  (testimonials.testimonials as Array<{ quote: string; name: string; detail?: string; photo?: string; photo_alt?: string; permission?: boolean }>).filter(
    (t) => t.permission && t.quote,
  );

type InstagramPost = { id: string; image: string; caption: string; alt: string; permalink: string; timestamp: string; is_video: boolean };
// Written by scripts/fetch-instagram.mjs during the build; missing locally unless you run it.
const igFiles = import.meta.glob<{ default: { posts: InstagramPost[] } }>('../content/generated/instagram.json', { eager: true });
export const instagramPosts = (): InstagramPost[] => Object.values(igFiles)[0]?.default.posts ?? [];
