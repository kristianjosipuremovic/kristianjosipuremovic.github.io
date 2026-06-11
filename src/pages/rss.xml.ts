import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog');
  const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'Kristian Uremovic — Writeups',
    description: 'Research notes, CTFs, home labs, and general writing.',
    site: context.site ?? 'https://kristianuremovic.com',
    items: sorted.map(post => {
      const slug = post.id.split('/').pop()!;
      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description,
        link: `/blog/${post.data.category}/${slug}`,
      };
    }),
    customData: '<language>en-us</language>',
  });
}
