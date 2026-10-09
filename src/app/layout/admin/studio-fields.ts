import { VISUALS } from '../../data/content-schema';
import type { Highlight, JourneyStop, Project } from '../../data/portfolio';

export type FieldKind = 'text' | 'textarea' | 'lines' | 'chips' | 'select' | 'check' | 'link' | 'links';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
  options?: readonly { id: string; label: string }[];
}

export type ListSection = 'projects' | 'journey' | 'highlights';

export interface ListConfig {
  noun: string;
  fields: FieldDef[];
  blank: () => Record<string, unknown>;
  title: (item: Record<string, unknown>) => string;
  sub: (item: Record<string, unknown>) => string;
}

const s = (v: unknown) => (typeof v === 'string' ? v : '');

export const LISTS: Record<ListSection, ListConfig> = {
  projects: {
    noun: 'project',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', required: true, placeholder: 'e.g. AIxITOPS' },
      { key: 'category', label: 'Category', kind: 'text', placeholder: 'Agentic AI · IT Ops' },
      { key: 'tagline', label: 'Tagline', kind: 'text', wide: true, placeholder: 'One line that sells it' },
      { key: 'summary', label: 'Summary', kind: 'textarea', wide: true },
      { key: 'highlights', label: 'What you did', kind: 'lines', wide: true, hint: 'One achievement per line' },
      { key: 'stack', label: 'Tech stack', kind: 'chips', wide: true, hint: 'Press Enter or comma to add' },
      { key: 'badge', label: 'Badge', kind: 'text', placeholder: 'In production · Open source…' },
      { key: 'visual', label: 'Schematic', kind: 'select', options: VISUALS },
      { key: 'visualTitle', label: 'Schematic title', kind: 'text', placeholder: 'orchestrator.flow' },
      { key: 'link', label: 'Link (optional)', kind: 'link', wide: true },
    ],
    blank: (): Record<string, unknown> => ({
      id: '',
      index: '',
      title: 'New project',
      tagline: '',
      category: '',
      summary: '',
      highlights: [],
      stack: [],
      visual: 'agents',
      visualTitle: '',
    }),
    title: (p) => s(p['title']) || 'Untitled project',
    sub: (p) => s(p['category']) || s(p['tagline']),
  },
  journey: {
    noun: 'experience',
    fields: [
      { key: 'role', label: 'Role / position', kind: 'text', required: true, wide: true, placeholder: 'Senior AI Engineer' },
      { key: 'org', label: 'Company / school', kind: 'text', required: true, placeholder: 'Xceedance' },
      { key: 'place', label: 'Location', kind: 'text', placeholder: 'Noida, UP' },
      { key: 'start', label: 'Start year', kind: 'text', required: true, placeholder: '2026', hint: 'Shown as the chapter year' },
      { key: 'period', label: 'Period', kind: 'text', placeholder: 'Mar 2026 — Present' },
      { key: 'points', label: 'What you did', kind: 'lines', wide: true, hint: 'One point per line' },
      { key: 'tags', label: 'Focus tags', kind: 'chips', wide: true },
      { key: 'badges', label: 'Awards (optional)', kind: 'chips', wide: true },
      { key: 'link', label: 'Link (optional)', kind: 'link', wide: true },
    ],
    blank: (): Record<string, unknown> => ({
      start: String(new Date().getFullYear()),
      period: '',
      role: 'New role',
      org: '',
      place: '',
      points: [],
      tags: [],
    }),
    title: (j) => s(j['role']) || 'Untitled role',
    sub: (j) => [s(j['org']), s(j['period'])].filter(Boolean).join(' · '),
  },
  highlights: {
    noun: 'highlight',
    fields: [
      { key: 'value', label: 'Headline', kind: 'text', required: true, placeholder: '#214 · SPOT · 500+' },
      { key: 'kicker', label: 'Label', kind: 'text', placeholder: 'Recognition · Xceedance' },
      { key: 'caption', label: 'Caption', kind: 'textarea', required: true, wide: true },
      { key: 'small', label: 'Long headline (smaller text)', kind: 'check' },
      { key: 'links', label: 'Links', kind: 'links', wide: true },
    ],
    blank: (): Record<string, unknown> => ({ kicker: '', value: 'New', caption: '' }),
    title: (h) => s(h['value']) || 'Untitled',
    sub: (h) => s(h['kicker']) || s(h['caption']),
  },
};

export const TABS = [
  { id: 'resume', label: 'Résumé' },
  { id: 'projects', label: 'Projects' },
  { id: 'journey', label: 'Experience' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'skills', label: 'Skills' },
  { id: 'profile', label: 'Profile' },
] as const;

/** Which stored sections each tab edits (for the "unpublished" dots and per-tab reset). */
export const TAB_SECTIONS = {
  resume: [],
  projects: ['projects'],
  journey: ['journey'],
  highlights: ['highlights'],
  skills: ['skills'],
  profile: ['profile', 'heroLede', 'heroRoles', 'bio', 'stats'],
} as const;
