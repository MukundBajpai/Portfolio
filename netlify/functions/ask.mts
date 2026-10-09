import type { Config, Context } from '@netlify/functions';
import { editableFrom, mergeContent, withContent } from '../../src/app/data/content-schema.ts';
import { buildChunks, systemPrompt } from '../../src/app/data/knowledge.ts';
import * as data from '../../src/app/data/portfolio.ts';
import { readContent } from '../lib/content-store.mts';
import { overLimit } from '../lib/rate-limit.mts';
import { json } from '../lib/resume-store.mts';

/*
 * "Ask my AI" with Claude. Set ANTHROPIC_API_KEY in Netlify to enable it; without it this answers 503 and
 * the site answers from the portfolio data in the browser instead (free, no key).
 */
const MODEL = 'claude-haiku-4-5-20251001';
const DEFAULTS = editableFrom(data);
let cached: { updatedAt: string | null; prompt: string } | null = null;

/** Facts include whatever the owner has published from the content studio. */
async function system(): Promise<string> {
  const stored = await readContent().catch(() => null);
  const updatedAt = stored?.updatedAt ?? null;
  if (cached?.updatedAt !== updatedAt || !cached) {
    const merged = withContent(data, mergeContent(DEFAULTS, stored?.content));
    cached = { updatedAt, prompt: systemPrompt(buildChunks(merged)) };
  }
  return cached.prompt;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

function clean(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 12) return null;
  const turns: Turn[] = [];
  for (const t of raw) {
    const role = (t as Turn)?.role;
    const content = (t as Turn)?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim() || content.length > 600) return null;
    turns.push({ role, content: content.trim() });
  }
  return turns[0].role === 'user' && turns[turns.length - 1].role === 'user' ? turns : null;
}

export default async (req: Request, context: Context): Promise<Response> => {
  const key = process.env['ANTHROPIC_API_KEY'];
  if (!key) return json({ error: 'not-configured' }, 503);

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null;
  const messages = clean(body?.messages);
  if (!messages) return json({ error: 'invalid' }, 400);
  if (await overLimit('ask', context.ip, 30, 60 * 60 * 1000)) return json({ error: 'rate-limited' }, 429);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 450, system: await system(), messages }),
  }).catch(() => null);
  if (!res?.ok) return json({ error: 'upstream' }, 502);
  const result = (await res.json().catch(() => null)) as { content?: { type: string; text?: string }[] } | null;
  const reply = result?.content?.find((c) => c.type === 'text')?.text?.trim();
  return reply ? json({ reply }) : json({ error: 'upstream' }, 502);
};

export const config: Config = { path: '/api/ask', method: 'POST' };
