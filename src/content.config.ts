import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Each collection is one folder of Markdown files, edited through Pages CMS.
// Files starting with "_" are ignored.

const events = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    time: z.string().optional().default(''),
    location: z.string().optional().default(''),
    description: z.string().optional().default(''),
    signup_url: z.string().optional().default(''),
    featured: z.boolean().optional().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    image: z.string().optional().default(''),
    image_alt: z.string().optional().default(''),
    published: z.boolean().optional().default(true),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
  schema: z.object({
    client: z.string(),
    client_url: z.string().optional().default(''),
    semester: z.string(),
    service_area: z.string(),
    summary: z.string(),
    result: z.string().optional().default(''),
    image: z.string().optional().default(''),
    image_alt: z.string().optional().default(''),
    client_approved: z.boolean().optional().default(false),
  }),
});

export const collections = { events, blog, projects };
