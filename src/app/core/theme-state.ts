import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { prefersReducedMotion } from './motion';
import { applyTheme, lightQuery, resolveTheme, saveTheme, storedTheme, Theme } from './theme';

/** Reactive wrapper around theme.ts so components can read/toggle the theme with a signal. */
@Injectable({ providedIn: 'root' })
export class ThemeState {
  readonly theme = signal<Theme>(resolveTheme());

  constructor() {
    if (environment.defaultTheme !== 'system') return;
    lightQuery().addEventListener('change', () => {
      if (storedTheme()) return;
      const theme = resolveTheme();
      applyTheme(theme);
      this.theme.set(theme);
    });
  }

  /** Switches theme with a circular reveal growing from (x, y) where the browser supports it. */
  toggle(x = innerWidth / 2, y = 0): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || prefersReducedMotion()) {
      this.set(next);
      return;
    }
    const transition = document.startViewTransition(() => this.set(next));
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  }

  set(theme: Theme): void {
    saveTheme(theme);
    this.theme.set(theme);
  }
}
