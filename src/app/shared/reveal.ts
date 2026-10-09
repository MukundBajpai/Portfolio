import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { gsap } from '../core/gsap';
import { prefersReducedMotion } from '../core/motion';

type RevealKind = 'up' | 'fade' | 'scale' | 'blur' | 'left' | 'right';

const FROM: Record<RevealKind, gsap.TweenVars> = {
  up: { y: 56, opacity: 0 },
  fade: { opacity: 0 },
  scale: { scale: 0.9, opacity: 0 },
  blur: { y: 28, opacity: 0, filter: 'blur(14px)' },
  left: { x: -64, opacity: 0 },
  right: { x: 64, opacity: 0 },
};

/** Scroll-triggered entrance. Uses opacity (not visibility) so hidden items stay keyboard-focusable. */
@Directive({ selector: '[appReveal]' })
export class Reveal {
  readonly appReveal = input<RevealKind | ''>('');
  readonly revealDelay = input(0);
  readonly revealStart = input('top 88%');

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      const tween = gsap.from(el, {
        ...FROM[this.appReveal() || 'up'],
        duration: 1.35,
        delay: this.revealDelay(),
        clearProps: 'transform,opacity,filter',
        scrollTrigger: { trigger: el, start: this.revealStart(), once: true },
      });
      destroyRef.onDestroy(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });
  }
}
