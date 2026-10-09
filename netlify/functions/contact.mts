import type { Config, Context } from '@netlify/functions';
import { json } from '../lib/resume-store.mts';
import { overLimit } from '../lib/rate-limit.mts';

/*
 * Contact form → your inbox, via Web3Forms (free). Set WEB3FORMS_KEY in Netlify (the key is emailed to you
 * at web3forms.com). Without it this answers 503 and the site falls back to the visitor's mail app.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async (req: Request, context: Context): Promise<Response> => {
  const key = process.env['WEB3FORMS_KEY'];
  if (!key) return json({ error: 'not-configured' }, 503);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.['name'] ?? '').trim();
  const email = String(body?.['email'] ?? '').trim();
  const message = String(body?.['message'] ?? '').trim();

  // Hidden "website" field: only bots fill it. Pretend success so they move on.
  if (body?.['website']) return json({ ok: true });
  if (!name || name.length > 100 || !EMAIL.test(email) || email.length > 200 || !message || message.length > 4000) {
    return json({ error: 'invalid' }, 400);
  }
  if (await overLimit('contact', context.ip, 5, 60 * 60 * 1000)) return json({ error: 'rate-limited' }, 429);

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: key,
      subject: `Portfolio enquiry from ${name}`,
      from_name: 'Portfolio contact form',
      name,
      email,
      message,
    }),
  }).catch(() => null);
  const result = (await res?.json().catch(() => null)) as { success?: boolean } | null;
  return result?.success ? json({ ok: true }) : json({ error: 'delivery-failed' }, 502);
};

export const config: Config = { path: '/api/contact', method: 'POST' };
