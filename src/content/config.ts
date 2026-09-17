import { defineCollection, z } from 'astro:content';

// Blog posts live at src/content/blog/{locale}/{slug}.md — the SAME slug in
// both locale folders forms a translation pair (BaseLayout derives hreflang
// from the /th path prefix, so matching slugs pair up automatically).
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    locale: z.enum(['en', 'th']),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
