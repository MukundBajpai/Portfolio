import type * as Data from './portfolio.ts';
import type { Highlight, JourneyStop, Link, Project, SkillGroup } from './portfolio.ts';

/*
 * The owner-editable parts of the site, as stored by the content studio. Shared by the studio (live
 * validation), the site (applied before bootstrap) and the Netlify functions (the real guard).
 * Keep it free of runtime imports so functions can load it.
 */

export const VISUALS = [
  { id: 'agents', label: 'Agent orchestration' },
  { id: 'sdlc', label: 'SDLC pipeline' },
  { id: 'rateload', label: 'Data classifier' },
  { id: 'broker', label: 'Portal / dashboard' },
] as const;

export type SkillId = SkillGroup['id'];
export const SKILL_IDS: SkillId[] = ['ai', 'platforms', 'backend', 'frontend', 'languages', 'cloud'];

export interface Stat {
  value: number;
  decimals: number;
  suffix: string;
  prefix?: string;
  label: string;
}

export interface ProfileContent {
  role: string;
  headline: string;
  location: string;
  email: string;
  socials: Link[];
}

export interface SkillContent {
  blurb: string;
  items: string[];
}

/** Every editable section, fully populated. */
export interface Editable {
  profile: ProfileContent;
  heroLede: string;
  heroRoles: string[];
  bio: string[];
  stats: Stat[];
  projects: Project[];
  journey: JourneyStop[];
  highlights: Highlight[];
  skills: Record<SkillId, SkillContent>;
}

/** What's stored: only the sections the owner changed. */
export type SiteContent = Partial<Editable>;
export type Section = keyof Editable;
export const SECTIONS: Section[] = ['profile', 'heroLede', 'heroRoles', 'bio', 'stats', 'projects', 'journey', 'highlights', 'skills'];

export const MAX_CONTENT_BYTES = 256 * 1024;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function editableFrom(d: typeof Data): Editable {
  const { role, headline, location, email, socials } = d.profile;
  return clone({
    profile: { role, headline, location, email, socials },
    heroLede: d.heroLede,
    heroRoles: d.heroRoles,
    bio: d.bio,
    stats: d.stats as Stat[],
    projects: d.projects,
    journey: d.journey,
    highlights: d.highlights,
    skills: Object.fromEntries(d.skillGroups.map((g) => [g.id, { blurb: g.blurb, items: g.items }])) as Record<SkillId, SkillContent>,
  });
}

export function mergeContent(base: Editable, overrides: SiteContent | null | undefined): Editable {
  const merged = clone(base);
  if (!overrides) return merged;
  for (const key of SECTIONS) {
    const value = overrides[key];
    if (value === undefined) continue;
    if (key === 'skills') merged.skills = { ...merged.skills, ...(value as Editable['skills']) };
    else (merged as unknown as Record<string, unknown>)[key] = clone(value);
  }
  return merged;
}

/** Sections of `next` that differ from `base` (what gets stored). */
export function diffContent(base: Editable, next: Editable): SiteContent {
  const out: Record<string, unknown> = {};
  for (const key of SECTIONS) {
    if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) out[key] = clone(next[key]);
  }
  return out as SiteContent;
}

/** A data module shaped like portfolio.ts with the content applied (for the chatbot's facts). */
export function withContent(d: typeof Data, e: Editable): typeof Data {
  return {
    ...d,
    profile: { ...d.profile, ...e.profile },
    heroLede: e.heroLede,
    heroRoles: e.heroRoles,
    bio: e.bio,
    stats: e.stats,
    projects: e.projects,
    journey: e.journey,
    highlights: e.highlights,
    skillGroups: d.skillGroups.map((g) => ({ ...g, ...e.skills[g.id] })),
  } as typeof Data;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SAFE_URL = /^(https?:\/\/|mailto:)[^\s<>"'`]+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(CONTROL, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';
const list = <T>(v: unknown, max: number, each: (x: unknown, i: number) => T | null): T[] =>
  Array.isArray(v) ? v.slice(0, max).map(each).filter((x): x is T => x !== null) : [];
const texts = (v: unknown, maxItems: number, maxLen: number): string[] => {
  const seen = new Set<string>();
  return list(v, maxItems, (x) => {
    const s = str(x, maxLen);
    if (!s || seen.has(s.toLowerCase())) return null;
    seen.add(s.toLowerCase());
    return s;
  });
};
const link = (v: unknown): Link | null => {
  const o = (v ?? {}) as Partial<Link>;
  const label = str(o.label, 40);
  const href = str(o.href, 500);
  return label && SAFE_URL.test(href) ? { label, href } : null;
};
export const slug = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});

function cleanProjects(v: unknown, errors: string[]): Project[] {
  const ids = new Set<string>();
  return list(v, 12, (raw, i) => {
    const o = obj(raw);
    const title = str(o['title'], 60);
    if (!title) {
      errors.push(`Project ${i + 1} needs a title.`);
      return null;
    }
    let id = slug(str(o['id'], 40) || title) || `project-${i + 1}`;
    while (ids.has(id)) id += '-2';
    ids.add(id);
    const visual = VISUALS.some((x) => x.id === o['visual']) ? (o['visual'] as Project['visual']) : 'agents';
    const badge = str(o['badge'], 30);
    const projectLink = link(o['link']);
    return {
      id,
      index: String(i + 1).padStart(2, '0'),
      title,
      tagline: str(o['tagline'], 120),
      category: str(o['category'], 60),
      ...(badge ? { badge } : {}),
      summary: str(o['summary'], 700),
      highlights: texts(o['highlights'], 6, 320),
      stack: texts(o['stack'], 14, 32),
      visual,
      visualTitle: str(o['visualTitle'], 32) || `${id}.flow`,
      ...(projectLink ? { link: projectLink } : {}),
    };
  }).map((p, i) => ({ ...p, index: String(i + 1).padStart(2, '0') }));
}

function cleanJourney(v: unknown, errors: string[]): JourneyStop[] {
  return list(v, 12, (raw, i) => {
    const o = obj(raw);
    const role = str(o['role'], 90);
    const org = str(o['org'], 90);
    const start = str(o['start'], 10);
    if (!role || !org || !start) {
      errors.push(`Experience ${i + 1} needs a role, organisation and start year.`);
      return null;
    }
    const badges = texts(o['badges'], 6, 40);
    const stopLink = link(o['link']);
    return {
      start,
      period: str(o['period'], 40) || start,
      role,
      org,
      place: str(o['place'], 60),
      points: texts(o['points'], 8, 400),
      tags: texts(o['tags'], 10, 32),
      ...(badges.length ? { badges } : {}),
      ...(stopLink ? { link: stopLink } : {}),
    };
  });
}

function cleanHighlights(v: unknown, errors: string[]): Highlight[] {
  return list(v, 16, (raw, i) => {
    const o = obj(raw);
    const value = str(o['value'], 20);
    const caption = str(o['caption'], 220);
    if (!value || !caption) {
      errors.push(`Highlight ${i + 1} needs a headline value and a caption.`);
      return null;
    }
    const links = list(o['links'], 3, link);
    return {
      kicker: str(o['kicker'], 40),
      value,
      caption,
      ...(o['small'] === true ? { small: true } : {}),
      ...(links.length ? { links } : {}),
    };
  });
}

function cleanStats(v: unknown, errors: string[]): Stat[] {
  return list(v, 4, (raw, i) => {
    const o = obj(raw);
    const value = Number(o['value']);
    const label = str(o['label'], 80);
    if (!Number.isFinite(value) || value < 0 || value > 1e6 || !label) {
      errors.push(`Stat ${i + 1} needs a number and a label.`);
      return null;
    }
    const prefix = str(o['prefix'], 3);
    const decimals = Math.max(0, Math.min(2, Math.round(Number(o['decimals']) || 0)));
    return { value, decimals, suffix: str(o['suffix'], 4), ...(prefix ? { prefix } : {}), label };
  });
}

/** Validates and normalises an incoming content document. Unknown keys are dropped. */
export function cleanContent(input: unknown): { content: SiteContent; errors: string[] } {
  const src = obj(input);
  const errors: string[] = [];
  const out: SiteContent = {};

  if ('profile' in src) {
    const o = obj(src['profile']);
    const email = str(o['email'], 120);
    const role = str(o['role'], 40);
    if (!role) errors.push('Profile needs a role.');
    if (!EMAIL.test(email)) errors.push('Profile email looks invalid.');
    out.profile = {
      role,
      headline: str(o['headline'], 90),
      location: str(o['location'], 60),
      email,
      socials: list(o['socials'], 6, link),
    };
  }
  if ('heroLede' in src) {
    out.heroLede = str(src['heroLede'], 360);
    if (!out.heroLede) errors.push('The hero introduction can’t be empty.');
  }
  if ('heroRoles' in src) {
    out.heroRoles = texts(src['heroRoles'], 8, 60);
    if (!out.heroRoles.length) errors.push('Add at least one rotating hero phrase.');
  }
  if ('bio' in src) out.bio = texts(src['bio'], 3, 700);
  if ('stats' in src) out.stats = cleanStats(src['stats'], errors);
  if ('projects' in src) {
    out.projects = cleanProjects(src['projects'], errors);
    if (!out.projects.length) errors.push('Keep at least one project.');
  }
  if ('journey' in src) {
    out.journey = cleanJourney(src['journey'], errors);
    if (!out.journey.length) errors.push('Keep at least one experience entry.');
  }
  if ('highlights' in src) {
    out.highlights = cleanHighlights(src['highlights'], errors);
    if (!out.highlights.length) errors.push('Keep at least one highlight.');
  }
  if ('skills' in src) {
    const o = obj(src['skills']);
    const skills: Partial<Record<SkillId, SkillContent>> = {};
    for (const id of SKILL_IDS) {
      if (!(id in o)) continue;
      const g = obj(o[id]);
      const items = texts(g['items'], 16, 32);
      if (!items.length) errors.push(`Skill group “${id}” needs at least one item.`);
      skills[id] = { blurb: str(g['blurb'], 200), items };
    }
    out.skills = skills as Record<SkillId, SkillContent>;
  }
  return { content: out, errors };
}
