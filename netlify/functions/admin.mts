import { getStore } from '@netlify/blobs';
import { purgeCache, type Config, type Context } from '@netlify/functions';
import { createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { cleanContent, MAX_CONTENT_BYTES } from '../../src/app/data/content-schema.ts';
import { CONTENT_TAG, readContent, writeContent } from '../lib/content-store.mts';
import { currentResume, json, MAX_RESUME_BYTES, RESUME_KEY, type ResumeMeta, resumeStore } from '../lib/resume-store.mts';

/*
 * Owner-only résumé management. The password is checked here, never in the browser.
 * Only a salted scrypt hash of the default password lives in the code; setting the
 * ADMIN_PASSWORD environment variable in Netlify replaces it.
 */
const SALT = Buffer.from('Dz3jNNZxCyb5FFZ+j2gwKw==', 'base64');
const DEFAULT_HASH = Buffer.from('olb6FDXNwKZKNER3txioZqrom4INht/ecSd5mba3ZiU=', 'base64');
const SCRYPT = { N: 16384, r: 8, p: 1 };

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface Attempts {
  failures: number;
  since: number;
}

const hash = (password: string) => scryptSync(password, SALT, 32, SCRYPT);

function passwordMatches(input: string): boolean {
  const configured = process.env['ADMIN_PASSWORD'];
  return timingSafeEqual(hash(input), configured ? hash(configured) : DEFAULT_HASH);
}

const guardStore = () => getStore({ name: 'admin-guard', consistency: 'strong' });

/** Returns an error response, or null when the password is right. Locks an IP out after repeated misses. */
async function authorize(context: Context, password: unknown): Promise<Response | null> {
  const store = guardStore();
  const key = createHash('sha256').update(context.ip || 'unknown').digest('hex');
  const now = Date.now();
  const record = (await store.get(key, { type: 'json' })) as Attempts | null;
  const recent = record && now - record.since < LOCKOUT_MS ? record : null;

  if (recent && recent.failures >= MAX_FAILURES) {
    const retryAfter = Math.ceil((recent.since + LOCKOUT_MS - now) / 1000);
    return json({ error: 'locked', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
  }
  if (typeof password === 'string' && password.length > 0 && password.length <= 256 && passwordMatches(password)) {
    if (record) await store.delete(key);
    return null;
  }
  const failures = (recent?.failures ?? 0) + 1;
  await store.setJSON(key, { failures, since: recent?.since ?? now } satisfies Attempts);
  return json({ error: 'unauthorized', attemptsLeft: Math.max(0, MAX_FAILURES - failures) }, 401);
}

function decodeHeader(value: string | null): string {
  try {
    return value ? decodeURIComponent(value) : '';
  } catch {
    return '';
  }
}

function cleanName(raw: string): string {
  const name = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 120);
  return name || 'resume.pdf';
}

export default async (req: Request, context: Context): Promise<Response> => {
  const { pathname } = new URL(req.url);

  if (pathname === '/api/admin/login') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
    const denied = await authorize(context, body?.password);
    if (denied) return denied;
    const [resume, content] = await Promise.all([currentResume(), readContent()]);
    return json({ ok: true, resume, content: content?.content ?? null, contentUpdatedAt: content?.updatedAt ?? null });
  }

  if (pathname === '/api/admin/content') {
    if (req.method !== 'PUT') return json({ error: 'method' }, 405);
    const denied = await authorize(context, decodeHeader(req.headers.get('x-admin-password')));
    if (denied) return denied;
    const raw = await req.text();
    if (raw.length > MAX_CONTENT_BYTES) return json({ error: 'too-large', max: MAX_CONTENT_BYTES }, 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: 'invalid', errors: ['That wasn’t valid JSON.'] }, 400);
    }
    const { content, errors } = cleanContent(parsed);
    if (errors.length) return json({ error: 'invalid', errors }, 400);
    const stored = await writeContent(content);
    // Visitors get the new content straight away instead of the CDN's cached copy.
    await purgeCache({ tags: [CONTENT_TAG] }).catch(() => undefined);
    return json({ ok: true, content: stored.content, contentUpdatedAt: stored.updatedAt });
  }

  if (req.method !== 'PUT' && req.method !== 'DELETE') return json({ error: 'method' }, 405);
  const denied = await authorize(context, decodeHeader(req.headers.get('x-admin-password')));
  if (denied) return denied;

  if (req.method === 'DELETE') {
    await resumeStore().delete(RESUME_KEY);
    return json({ ok: true, resume: null });
  }

  if (Number(req.headers.get('content-length') ?? 0) > MAX_RESUME_BYTES) {
    return json({ error: 'too-large', max: MAX_RESUME_BYTES }, 413);
  }
  const data = await req.arrayBuffer();
  if (data.byteLength === 0 || data.byteLength > MAX_RESUME_BYTES) {
    return json({ error: 'too-large', max: MAX_RESUME_BYTES }, 413);
  }
  if (new TextDecoder().decode(data.slice(0, 5)) !== '%PDF-') return json({ error: 'not-pdf' }, 415);

  const meta: ResumeMeta = {
    name: cleanName(decodeHeader(req.headers.get('x-file-name'))),
    size: data.byteLength,
    uploadedAt: new Date().toISOString(),
  };
  await resumeStore().set(RESUME_KEY, data, { metadata: { ...meta } });
  return json({ ok: true, resume: meta });
};

export const config: Config = {
  path: ['/api/admin/login', '/api/admin/resume', '/api/admin/content'],
  method: ['POST', 'PUT', 'DELETE'],
};
