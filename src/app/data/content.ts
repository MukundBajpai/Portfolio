import { environment } from '../../environments/environment';
import { Editable, editableFrom, mergeContent, SiteContent } from './content-schema';
import * as data from './portfolio';

/** The content as built into the site, before any published edits (the studio's "reset" target). */
export const originals: Editable = editableFrom(data);

export interface PublishedContent {
  content: SiteContent | null;
  updatedAt: string | null;
}

const replace = <T>(target: T[], next: T[]) => target.splice(0, target.length, ...next);

/** Writes content into the portfolio data module in place, so every section reads the edited version. */
export function applyContent(content: SiteContent | null): void {
  const e = mergeContent(originals, content);
  Object.assign(data.profile, e.profile);
  data.setHeroLede(e.heroLede);
  replace(data.heroRoles, e.heroRoles);
  replace(data.bio, e.bio);
  replace(data.stats as unknown[], e.stats);
  replace(data.projects, e.projects);
  replace(data.journey, e.journey);
  replace(data.highlights, e.highlights);
  for (const group of data.skillGroups) Object.assign(group, e.skills[group.id]);
}

/**
 * Fetches the owner's published edits before the app boots (main.ts), so sections and their scroll
 * animations are built from the final content. A slow or missing API never blocks the site for long.
 */
export async function loadContent(timeoutMs = 1800): Promise<void> {
  if (!environment.ownerAdmin) return;
  try {
    const res = await fetch('/api/content', { signal: AbortSignal.timeout(timeoutMs) });
    // The dev server and static-only deploys answer with HTML: keep the built-in content.
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
    const { content } = (await res.json()) as PublishedContent;
    if (content) applyContent(content);
  } catch {
    // Offline or slow: built-in content.
  }
}
