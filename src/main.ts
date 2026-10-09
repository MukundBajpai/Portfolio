import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { prefersReducedMotion } from './app/core/motion';
import { restorePalettePreview } from './app/core/palette';
import { initQuality } from './app/core/quality';
import { applyTheme, resolveTheme } from './app/core/theme';
import { loadContent } from './app/data/content';

// Set before first paint so CSS-driven motion (grain, marquees, orbits) honours the preference too.
document.documentElement.classList.toggle('reduce-motion', prefersReducedMotion());
applyTheme(resolveTheme());
restorePalettePreview();
initQuality();

// The owner's published edits land before any section (and its scroll animations) is built.
void loadContent()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
