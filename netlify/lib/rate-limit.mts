import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

interface Window {
  count: number;
  since: number;
}

/** Counts a hit for this visitor and reports whether they've gone over `limit` within `windowMs`. */
export async function overLimit(bucket: string, ip: string | undefined, limit: number, windowMs: number): Promise<boolean> {
  const store = getStore({ name: `limit-${bucket}`, consistency: 'strong' });
  const key = createHash('sha256').update(ip || 'unknown').digest('hex');
  const now = Date.now();
  const saved = (await store.get(key, { type: 'json' })) as Window | null;
  const current = saved && now - saved.since < windowMs ? saved : { count: 0, since: now };
  current.count += 1;
  await store.setJSON(key, current);
  return current.count > limit;
}
