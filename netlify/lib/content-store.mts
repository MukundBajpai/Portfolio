import { getStore } from '@netlify/blobs';
import type { SiteContent } from '../../src/app/data/content-schema.ts';

const KEY = 'site';
export const CONTENT_TAG = 'site-content';

export interface StoredContent {
  content: SiteContent;
  updatedAt: string;
}

export const contentStore = () => getStore({ name: 'content', consistency: 'strong' });

export async function readContent(): Promise<StoredContent | null> {
  return ((await contentStore().get(KEY, { type: 'json' })) as StoredContent | null) ?? null;
}

export async function writeContent(content: SiteContent): Promise<StoredContent> {
  const stored: StoredContent = { content, updatedAt: new Date().toISOString() };
  await contentStore().setJSON(KEY, stored);
  return stored;
}
