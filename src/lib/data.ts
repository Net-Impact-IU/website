import { getCollection } from 'astro:content';
import site from '../content/settings/site.json';
import officers from '../content/settings/officers.json';
import impact from '../content/settings/impact.json';
import faq from '../content/settings/faq.json';
import gallery from '../content/settings/gallery.json';
import testimonials from '../content/settings/testimonials.json';

export { site, officers, impact, faq, gallery, testimonials };

/** Upcoming events, soonest first. Past events drop off on the next build (daily). */
export async function upcomingEvents() {
  const all = await getCollection('events');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return all
    .filter((e) => e.data.date >= today)
    .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
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
