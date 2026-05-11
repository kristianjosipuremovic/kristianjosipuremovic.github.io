import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesPart: z.number().optional(),
  }),
});

export const collections = { blog };
