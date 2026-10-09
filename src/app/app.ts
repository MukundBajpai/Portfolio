import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { watchFrameRate } from './core/quality';
import { ResumeService } from './core/resume';
import { SmoothScroll } from './core/smooth-scroll';
import { AdminPanel } from './layout/admin/admin-panel';
import { AskAi } from './layout/ask-ai/ask-ai';
import { Cursor } from './layout/cursor/cursor';
import { Footer } from './layout/footer/footer';
import { MotionNotice } from './layout/motion-notice/motion-notice';
import { PaletteLab } from './layout/palette-lab/palette-lab';
import { Navbar } from './layout/navbar/navbar';
import { ParticleField } from './layout/particle-field/particle-field';
import { Preloader } from './layout/preloader/preloader';
import { About } from './sections/about/about';
import { Contact } from './sections/contact/contact';
import { Experience } from './sections/experience/experience';
import { Figure } from './sections/figure/figure';
import { Hero } from './sections/hero/hero';
import { Highlights } from './sections/highlights/highlights';
import { Marquee } from './sections/marquee/marquee';
import { Skills } from './sections/skills/skills';
import { Work } from './sections/work/work';

@Component({
  selector: 'app-root',
  imports: [
    Preloader,
    Cursor,
    ParticleField,
    Navbar,
    Hero,
    Marquee,
    About,
    Figure,
    Work,
    Skills,
    Experience,
    Highlights,
    Contact,
    Footer,
    MotionNotice,
    PaletteLab,
    AskAi,
    AdminPanel,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Created first so Lenis owns scrolling before any section registers ScrollTriggers.
  private readonly scroll = inject(SmoothScroll);
  protected readonly resume = inject(ResumeService);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stopWatching = watchFrameRate();
      const offscreen = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)),
        { rootMargin: '200px 0px' },
      );
      document.querySelectorAll('main > *, app-footer').forEach((el) => offscreen.observe(el));
      destroyRef.onDestroy(() => {
        stopWatching();
        offscreen.disconnect();
      });
    });
  }
}
