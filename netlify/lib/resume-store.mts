import { getStore } from '@netlify/blobs';

export const RESUME_KEY = 'current';
/** Netlify caps function request bodies at ~6 MB (base64-encoded), so binary uploads stay under 4 MB. */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

export interface ResumeMeta {
  name: string;
  size: number;
  uploadedAt: string;
}

export const resumeStore = () => getStore({ name: 'resume', consistency: 'strong' });

export async function currentResume(): Promise<ResumeMeta | null> {
  const entry = await resumeStore().getMetadata(RESUME_KEY);
  return entry ? (entry.metadata as unknown as ResumeMeta) : null;
}

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
