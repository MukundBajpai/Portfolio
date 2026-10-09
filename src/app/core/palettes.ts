/**
 * Colour themes for the (optional) theme picker. `vars` override the CSS tokens in styles.css;
 * `tones` + `shares` feed the particle field. The first palette mirrors the :root defaults.
 */
export interface Palette {
  id: string;
  name: string;
  group: string;
  vars: Record<string, string>;
  tones: Tone[];
  /** Cumulative share of particles per tone. */
  shares: number[];
}

export type Tone = [number, number, number];

type Base = 'original' | 'neutral' | 'warm' | 'green' | 'navy' | 'plum';

interface ThemeSpec {
  id: string;
  name: string;
  group: string;
  accent: string;
  deep: string;
  soft: string;
  /** Second hue of a "×" combination; defaults to `soft` (single-hue theme). */
  second?: string;
  /** Live / done states; defaults to teal. */
  signal?: string;
  /** Text on accent-filled surfaces; defaults to near-black. */
  onAccent?: string;
  /** Accent used for text (headline italics, labels); defaults to `soft`. */
  text?: string;
  base?: Base;
  tones?: Tone[];
  shares?: number[];
}

const BASES: Record<Base, Record<string, string>> = {
  original: { void: '#050505', night: '#0a0a0b', coal: '#101012', ash: '#19191c', ink: '#f3ede4', mist: '#b5ada2', smoke: '#85807a', silver: '#9a9186' },
  neutral: { void: '#070707', night: '#0b0b0b', coal: '#111111', ash: '#1a1a1a', ink: '#f0f0f0', mist: '#a9a9a9', smoke: '#7d7d7d', silver: '#9b9b9b' },
  warm: { void: '#080706', night: '#0d0b09', coal: '#13110e', ash: '#1c1915', ink: '#f1efea', mist: '#aca79f', smoke: '#827d75', silver: '#a19b90' },
  green: { void: '#050806', night: '#09100c', coal: '#0e1611', ash: '#16211a', ink: '#eef3ef', mist: '#a3aea7', smoke: '#77837b', silver: '#97a39b' },
  navy: { void: '#05070b', night: '#090c12', coal: '#0e131b', ash: '#161c27', ink: '#eef2f8', mist: '#a3abb9', smoke: '#778093', silver: '#97a1b3' },
  plum: { void: '#07060b', night: '#0c0a12', coal: '#121019', ash: '#1b1824', ink: '#f1eff6', mist: '#aba6b8', smoke: '#7f798f', silver: '#a09ab0' },
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbVar = (hex: string) => rgb(hex).join(' ');
const tone = (hex: string) => rgb(hex).map((c) => c / 255) as Tone;

function theme(spec: ThemeSpec): Palette {
  const second = spec.second ?? spec.soft;
  const signal = spec.signal ?? '#4fd1c5';
  const b = BASES[spec.base ?? 'neutral'];
  return {
    id: spec.id,
    name: spec.name,
    group: spec.group,
    vars: {
      '--void': b['void'],
      '--night': b['night'],
      '--coal': b['coal'],
      '--ash': b['ash'],
      '--ink': b['ink'],
      '--ink-rgb': rgbVar(b['ink']),
      '--mist': b['mist'],
      '--smoke': b['smoke'],
      '--silver': b['silver'],
      '--accent': spec.accent,
      '--accent-rgb': rgbVar(spec.accent),
      '--accent-soft': spec.soft,
      '--accent-soft-rgb': rgbVar(spec.soft),
      '--accent-deep': spec.deep,
      '--accent-2': second,
      '--accent-2-rgb': rgbVar(second),
      '--accent-text': spec.text ?? spec.soft,
      '--on-accent': spec.onAccent ?? '#0b0b0b',
      '--signal': signal,
      '--signal-rgb': rgbVar(signal),
      '--gradient': `linear-gradient(120deg, ${spec.deep} 0%, ${spec.accent} 50%, ${second} 100%)`,
    },
    tones: spec.tones ?? [tone(b['ink']), tone(spec.accent), tone(second), tone(b['silver'])],
    shares: spec.shares ?? [0.55, 0.8, 0.92, 1],
  };
}

const GOLD = '#d4a64a';
const TEAL = '#2ec4b6';
const WHITE = '#ffffff';

export const PALETTES: Palette[] = [
  // The launch palette (default)
  theme({
    id: 'ember', name: 'Ember (original)', group: 'Original',
    accent: '#ff7a2f', deep: '#ff4d1c', soft: '#ffb070', text: '#ff7a2f', onAccent: '#050505', base: 'original',
    tones: [[0.95, 0.91, 0.85], [1.0, 0.45, 0.16], [1.0, 0.69, 0.42], [0.31, 0.82, 0.77]],
    shares: [0.56, 0.86, 0.96, 1],
  }),

  // Warm
  theme({ id: 'noir-gold', name: 'Noir Gold', group: 'Warm', accent: '#d4af37', deep: '#8c6d1f', soft: '#f0d27a', second: '#f5e3b0', base: 'warm' }),
  theme({ id: 'amber', name: 'Amber', group: 'Warm', accent: '#ffb000', deep: '#d97706', soft: '#ffd166', base: 'warm' }),
  theme({ id: 'sunset', name: 'Sunset (Orange × Pink)', group: 'Warm', accent: '#ff6b35', deep: '#e8430f', soft: '#ffa07a', second: '#ff4d8d', signal: '#ff4d8d' }),
  theme({ id: 'rose-gold', name: 'Rose Gold', group: 'Warm', accent: '#f4a79d', deep: '#c9786a', soft: '#ffd0c7', second: GOLD, signal: GOLD, base: 'warm' }),
  theme({ id: 'ember-ice', name: 'Ember × Ice', group: 'Warm', accent: '#ff7a2f', deep: '#ff4d1c', soft: '#ffb070', second: '#5ab8ff', signal: '#5ab8ff', text: '#ff7a2f' }),

  // Cool
  theme({ id: 'arctic', name: 'Arctic', group: 'Cool', accent: '#5ab8ff', deep: '#1e6fd9', soft: '#a8dcff', second: '#e6f4ff', base: 'navy' }),
  theme({ id: 'electric', name: 'Electric Blue', group: 'Cool', accent: '#2f6bff', deep: '#1d3fd6', soft: '#7fa2ff', onAccent: WHITE, base: 'navy' }),
  theme({ id: 'ocean', name: 'Ocean (Teal × Sky)', group: 'Cool', accent: '#14b8a6', deep: '#0f766e', soft: '#5eead4', second: '#38bdf8', signal: '#38bdf8', base: 'navy' }),
  theme({ id: 'cyber', name: 'Cyber (Cyan × Magenta)', group: 'Cool', accent: '#00e5ff', deep: '#0091a7', soft: '#7df3ff', second: '#ff2bd6', signal: '#ff2bd6', base: 'navy' }),
  theme({ id: 'midnight', name: 'Midnight (Cobalt × Violet)', group: 'Cool', accent: '#4d7cff', deep: '#2f4dff', soft: '#9bb6ff', second: '#9d6bff', signal: '#5ce1ff', onAccent: WHITE, base: 'navy' }),
  theme({ id: 'ultraviolet', name: 'Ultraviolet', group: 'Cool', accent: '#8b5cf6', deep: '#6d28d9', soft: '#c4b5fd', onAccent: WHITE, base: 'plum' }),
  theme({ id: 'lavender', name: 'Lavender', group: 'Cool', accent: '#b8a6ff', deep: '#7c6cf0', soft: '#ddd4ff', base: 'plum' }),

  // Green
  theme({ id: 'emerald', name: 'Emerald', group: 'Green', accent: '#10b981', deep: '#047857', soft: '#6ee7b7', base: 'green' }),
  theme({ id: 'mint', name: 'Mint', group: 'Green', accent: '#3ddc97', deep: '#0f9b62', soft: '#a7f3d0', base: 'green' }),
  theme({ id: 'matrix', name: 'Matrix', group: 'Green', accent: '#00ff41', deep: '#00a82b', soft: '#8cff9e', base: 'green' }),
  theme({ id: 'volt', name: 'Volt (Lime)', group: 'Green', accent: '#d7ff3c', deep: '#a2dc00', soft: '#e9ff9a' }),
  theme({ id: 'emerald-gold', name: 'Emerald × Gold', group: 'Green', accent: '#10b981', deep: '#047857', soft: '#6ee7b7', second: GOLD, signal: GOLD, base: 'green' }),

  // Pink & monochrome
  theme({ id: 'sakura', name: 'Sakura', group: 'Pink & Mono', accent: '#ff4d8d', deep: '#c2185b', soft: '#ff9ec2', second: '#ff85b3' }),
  theme({ id: 'tokyo', name: 'Tokyo (Pink × Cyan)', group: 'Pink & Mono', accent: '#ff2e88', deep: '#c2185b', soft: '#ff8cc2', second: '#3ee8ff', signal: '#3ee8ff' }),
  theme({ id: 'mono', name: 'Mono', group: 'Pink & Mono', accent: WHITE, deep: '#9a9a9a', soft: '#d9d9d9', second: '#bdbdbd', signal: '#ff3b30' }),

  // Deep reds
  theme({ id: 'crimson', name: 'Crimson', group: 'Reds', accent: '#e11d2e', deep: '#8f0d19', soft: '#ff5a66', onAccent: WHITE }),
  theme({ id: 'garnet', name: 'Garnet', group: 'Reds', accent: '#c1121f', deep: '#6d0a12', soft: '#f0404d', onAccent: WHITE }),
  theme({ id: 'oxblood', name: 'Oxblood', group: 'Reds', accent: '#9b111e', deep: '#560912', soft: '#e04b5a', onAccent: WHITE }),
  theme({ id: 'scarlet', name: 'Scarlet', group: 'Reds', accent: '#ff2a3d', deep: '#b8001f', soft: '#ff7a85', onAccent: WHITE }),
  theme({ id: 'crimson-gold', name: 'Crimson × Gold', group: 'Reds', accent: '#e11d2e', deep: '#8f0d19', soft: '#ff5a66', second: GOLD, signal: GOLD, onAccent: WHITE }),
  theme({ id: 'wine-rose', name: 'Wine × Rose', group: 'Reds', accent: '#a4133c', deep: '#5c0a22', soft: '#e0567a', second: '#ff8fab', signal: '#ff8fab', onAccent: WHITE }),
  theme({ id: 'crimson-teal', name: 'Crimson × Teal', group: 'Reds', accent: '#e11d2e', deep: '#8f0d19', soft: '#ff5a66', second: TEAL, signal: TEAL, onAccent: WHITE }),
  theme({ id: 'royal', name: 'Royal (Purple × Gold)', group: 'Cool', accent: '#8b5cf6', deep: '#5b21b6', soft: '#c4b5fd', second: GOLD, signal: GOLD, onAccent: WHITE, base: 'plum' }),
  theme({ id: 'magma', name: 'Magma (Red × Amber)', group: 'Reds', accent: '#ff3d2e', deep: '#b3170f', soft: '#ff8a5c', second: '#ffb000', signal: '#ffb000' }),
];

export const PALETTE_GROUPS = [...new Set(PALETTES.map((p) => p.group))];

export const DEFAULT_PALETTE = PALETTES[0];
