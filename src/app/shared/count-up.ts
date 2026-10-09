import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { gsap } from '../core/gsap';
import { prefersReducedMotion } from '../core/motion';

/** Counts from 0 to the bound value when scrolled into view; with reduced motion the static final value stays. */
@Directive({ selector: '[appCountUp]' })
export class CountUp {
  readonly appCountUp = input.required<number>();
  readonly decimals = input(0);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      const decimals = this.decimals();
      const counter = { v: 0 };
      const render = () => (el.textContent = counter.v.toFixed(decimals));
      render();
      const tween = gsap.to(counter, {
        v: this.appCountUp(),
        duration: 2.4,
        ease: 'power3.out',
        onUpdate: render,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
      destroyRef.onDestroy(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });
  }
}
