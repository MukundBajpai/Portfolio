import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { DEFAULT_PALETTE, Palette, PALETTES } from './palettes';

const KEY = 'mb-palette';
const STYLE_ID = 'mb-palette-vars';

/** Theme previews for the optional picker (environment.themePicker); otherwise the :root defaults apply. */
@Injectable({ providedIn: 'root' })
export class PaletteService {
  readonly current = signal<Palette>(storedPalette() ?? DEFAULT_PALETTE);

  apply(id: string): void {
    const palette = PALETTES.find((p) => p.id === id);
    if (!palette) return;
    paint(palette);
    this.current.set(palette);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // Storage blocked: the preview still applies for this page view.
    }
  }
}

/** Called from main.ts before bootstrap so a stored preview never flashes the default first. */
export function restorePalettePreview(): void {
  const palette = storedPalette();
  if (palette) paint(palette);
}

function storedPalette(): Palette | undefined {
  if (!environment.themePicker) return undefined;
  try {
    const id = localStorage.getItem(KEY);
    return PALETTES.find((p) => p.id === id);
  } catch {
    return undefined;
  }
}

const NEUTRALS = new Set(['--void', '--night', '--coal', '--ash', '--ink', '--ink-rgb', '--mist', '--smoke', '--silver']);

/**
 * Writes a <style> rather than inline vars so light mode keeps its own neutrals: the palette's
 * dark neutrals apply to dark mode and `.island`s, its accents to both themes.
 */
function paint(palette: Palette): void {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }
  const decls = (entries: [string, string][]) => entries.map(([name, value]) => `${name}:${value}`).join(';');
  const all = Object.entries(palette.vars);
  const accents = all.filter(([name]) => !NEUTRALS.has(name));
  const deep = palette.vars['--accent-deep'];
  style.textContent =
    `:root,:root.theme-light .island{${decls(all)}}` +
    `:root.theme-light{${decls(accents)};--accent-text:${deep};--accent-soft-text:${deep}}`;
}
