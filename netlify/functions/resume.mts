import type { Config } from '@netlify/functions';
import { currentResume, json, RESUME_KEY, resumeStore } from '../lib/resume-store.mts';

/** Public: the uploaded résumé (if any) and its details. The site falls back to the bundled PDF. */
export default async (req: Request): Promise<Response> => {
  if (new URL(req.url).pathname === '/api/resume/info') {
    const meta = await currentResume();
    return json(meta ? { custom: true, ...meta } : { custom: false });
  }

  const entry = await resumeStore().getWithMetadata(RESUME_KEY, { type: 'arrayBuffer' });
  if (!entry) return json({ error: 'not-found' }, 404);
  return new Response(entry.data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Mukund-Bajpai-Resume.pdf"',
      // Links carry ?v=<upload time>, so a new upload is a new URL.
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const config: Config = {
  path: ['/api/resume', '/api/resume/info'],
  method: 'GET',
};
