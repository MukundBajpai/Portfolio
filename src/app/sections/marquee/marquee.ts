import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { gsap } from '../../core/gsap';
import { prefersReducedMotion } from '../../core/motion';
import { SmoothScroll } from '../../core/smooth-scroll';
import { marquee } from '../../data/portfolio';

/** Two crossing tapes whose speed and direction follow scroll velocity. */
@Component({
  selector: 'app-marquee',
  templateUrl: './marquee.html',
  styleUrl: './marquee.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Marquee {
  protected readonly rows = [
    { variant: 'accent', items: Array(4).fill(marquee.primary).flat() as string[] },
    { variant: 'dark', items: Array(4).fill(marquee.secondary).flat() as string[] },
  ];

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const scroll = inject(SmoothScroll);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      const tracks = Array.from(host.querySelectorAll<HTMLElement>('.marquee__track'));
      const setX = tracks.map((t) => gsap.quickSetter(t, 'xPercent'));
      const skews = tracks.map((t) => gsap.quickTo(t, 'skewX', { duration: 0.5, ease: 'power3.out' }));
      const offsets = tracks.map(() => 0);
      const wrap = gsap.utils.wrap(-50, 0);
      const baseSpeed = [1.4, 1.1]; // % of track per second
      let direction = 1;
      let boost = 0;
      let skewed = false;

      const offScroll = scroll.onScroll(({ velocity, direction: dir }) => {
        if (dir) direction = dir;
        boost = Math.min(Math.abs(velocity) * 0.09, 7);
        skewed = true;
        skews.forEach((skew, i) => skew(gsap.utils.clamp(-10, 10, velocity * (i ? -0.25 : 0.25))));
      });

      const tick = (_time: number, deltaMs: number) => {
        boost *= 0.94;
        const dt = deltaMs / 1000;
        tracks.forEach((_, i) => {
          const sign = i === 0 ? -1 : 1;
          offsets[i] = wrap(offsets[i] + sign * direction * baseSpeed[i] * (1 + boost) * dt);
          setX[i](offsets[i]);
        });
        if (skewed && boost < 0.05) {
          skewed = false;
          skews.forEach((skew) => skew(0));
        }
      };
      gsap.ticker.add(tick);

      destroyRef.onDestroy(() => {
        offScroll();
        gsap.ticker.remove(tick);
      });
    });
  }
}
