import type { Config } from '@netlify/functions';
import { CONTENT_TAG, readContent } from '../lib/content-store.mts';
import { json } from '../lib/resume-store.mts';

/**
 * Public: the owner's published edits (or null → the site keeps its built-in content). Cached on Netlify's
 * CDN until the studio publishes again, which purges this tag, so visitors don't pay a function call each.
 */
export default async (): Promise<Response> => {
  const stored = await readContent();
  return json(stored ?? { content: null, updatedAt: null }, 200, {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=31536000, stale-while-revalidate=60',
    'Netlify-Cache-Tag': CONTENT_TAG,
  });
};

export const config: Config = { path: '/api/content', method: 'GET' };
