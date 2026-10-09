import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from '../../core/gsap';
import { prefersReducedMotion } from '../../core/motion';
import { highlights } from '../../data/portfolio';
import { SplitReveal } from '../../shared/split';

/** A film strip of achievements: pinned + scrubbed horizontally on desktop, swipeable on touch. */
@Component({
  selector: 'app-highlights',
  imports: [SplitReveal],
  templateUrl: './highlights.html',
  styleUrl: './highlights.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Highlights {
  protected readonly items = highlights;
  protected readonly current = signal(0);
  protected readonly pad = (n: number) => String(n).padStart(2, '0');

  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly strip = viewChild.required<ElementRef<HTMLElement>>('strip');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const section = this.section().nativeElement;
      const strip = this.strip().nativeElement;
      const track = this.track().nativeElement;
      const bar = this.bar().nativeElement;
      const frames = Array.from(track.querySelectorAll<HTMLElement>('.frame'));
      const setIndex = (progress: number) => {
        bar.style.transform = `scaleX(${progress})`;
        const i = Math.round(progress * (frames.length - 1));
        if (i !== this.current()) this.current.set(i);
      };

      const mm = gsap.matchMedia();
      const reduced = prefersReducedMotion();

      mm.add(reduced ? 'not all' : '(min-width: 900px)', () => {
        const gutter = () => parseFloat(getComputedStyle(strip).paddingLeft) || 0;
        const distance = () => Math.max(0, track.scrollWidth + gutter() * 2 - window.innerWidth);
        const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });

        let scrub: gsap.core.Tween | undefined;

        // Focus pull: the frame nearest the centre is brightest; the strip leans with scroll speed.
        const focus = () => {
          const mid = window.innerWidth / 2;
          for (const frame of frames) {
            const r = frame.getBoundingClientRect();
            const d = Math.min(Math.abs(r.left + r.width / 2 - mid) / mid, 1);
            gsap.set(frame, { scale: 1 - d * 0.08, opacity: 1 - d * 0.55 });
          }
          const v = scrub?.scrollTrigger?.getVelocity() ?? 0;
          skewTo(gsap.utils.clamp(-7, 7, v / -350));
        };

        scrub = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => setIndex(self.progress),
            onRefresh: focus,
            // Only pay for per-frame measuring while the strip is actually pinned on screen.
            onToggle: (self) => {
              if (self.isActive) {
                gsap.ticker.add(focus);
              } else {
                gsap.ticker.remove(focus);
                skewTo(0);
              }
            },
          },
        });
        focus();
        return () => gsap.ticker.remove(focus);
      });

      mm.add(reduced ? 'all' : '(max-width: 899px)', () => {
        const onScroll = () => {
          const max = strip.scrollWidth - strip.clientWidth;
          setIndex(max > 0 ? strip.scrollLeft / max : 0);
        };
        strip.addEventListener('scroll', onScroll, { passive: true });
        return () => strip.removeEventListener('scroll', onScroll);
      });

      destroyRef.onDestroy(() => mm.revert());
    });
  }
}
