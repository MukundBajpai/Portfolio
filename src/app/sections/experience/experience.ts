import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { gsap, ScrollTrigger } from '../../core/gsap';
import { prefersReducedMotion } from '../../core/motion';
import { journey } from '../../data/portfolio';
import { Reveal } from '../../shared/reveal';
import { SplitReveal } from '../../shared/split';
import { Spotlight } from '../../shared/spotlight';

@Component({
  selector: 'app-experience',
  imports: [Reveal, SplitReveal, Spotlight],
  templateUrl: './experience.html',
  styleUrl: './experience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Experience {
  protected readonly stops = journey;
  protected readonly active = signal(0);
  protected readonly pad = (n: number) => String(n).padStart(2, '0');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const ctx = gsap.context(() => {
        const items = gsap.utils.toArray<HTMLElement>('.stop', host);
        items.forEach((item, i) =>
          ScrollTrigger.create({
            trigger: item,
            start: 'top 62%',
            end: 'bottom 62%',
            onToggle: (self) => self.isActive && this.active.set(i),
          }),
        );

        if (prefersReducedMotion()) return;
        const list = host.querySelector('.journey__list');
        gsap
          .timeline({ scrollTrigger: { trigger: list, start: 'top 62%', end: 'bottom 62%', scrub: 0.4 } })
          .fromTo(host.querySelector('.journey__beam'), { scaleY: 0 }, { scaleY: 1, ease: 'none' }, 0)
          .fromTo(host.querySelector('.journey__head'), { top: '0%' }, { top: '100%', ease: 'none' }, 0);

        items.forEach((item) =>
          gsap.from(item.querySelector('.stop__card'), {
            opacity: 0,
            x: 80,
            rotationY: -14,
            transformPerspective: 1200,
            transformOrigin: '0% 50%',
            duration: 1.4,
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: item, start: 'top 82%', once: true },
          }),
        );
      }, host);
      destroyRef.onDestroy(() => ctx.revert());
    });
  }
}
