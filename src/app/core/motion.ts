import { environment } from '../../environments/environment';

const MOTION_KEY = 'mb-motion';

export type MotionChoice = 'full' | 'reduced';

/** The visitor's explicit choice from the motion toggle, if they made one. */
export function motionChoice(): MotionChoice | null {
  try {
    const value = localStorage.getItem(MOTION_KEY);
    return value === 'full' || value === 'reduced' ? value : null;
  } catch {
    return null;
  }
}

export const systemPrefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let reduced: boolean | undefined;

/**
 * An explicit choice from the on-page toggle wins; otherwise full motion, unless environment.respectReducedMotion
 * says to follow the OS setting. Fixed for the page's lifetime.
 */
export function prefersReducedMotion(): boolean {
  if (reduced === undefined) {
    const choice = motionChoice();
    reduced = choice ? choice === 'reduced' : environment.respectReducedMotion && systemPrefersReducedMotion();
  }
  return reduced;
}

/** Persists the choice; `reload` re-initialises every animation under the new setting. */
export function saveMotionChoice(choice: MotionChoice, reload = true): void {
  try {
    localStorage.setItem(MOTION_KEY, choice);
  } catch {
    return;
  }
  if (reload) window.location.reload();
}

export const isFinePointer = (): boolean =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let fontsPromise: Promise<void> | undefined;

/** Resolves once the display fonts are in, or after a timeout so a blocked font CDN never stalls the page. */
export function fontsReady(timeoutMs = 2500): Promise<void> {
  fontsPromise ??= Promise.race([
    Promise.all([
      document.fonts.load('400 1em Anton'),
      document.fonts.load('italic 400 1em "Instrument Serif"'),
      document.fonts.load('500 1em Geist'),
      document.fonts.load('400 1em "Geist Mono"'),
    ]).then(() => document.fonts.ready),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]).then(
    () => undefined,
    () => undefined,
  );
  return fontsPromise;
}
