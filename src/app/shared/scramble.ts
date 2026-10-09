import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { gsap } from '../core/gsap';
import { isFinePointer, prefersReducedMotion } from '../core/motion';

/** Decodes the element's text through random glyphs on hover. Best on monospace labels. */
@Directive({ selector: '[appScramble]' })
export class Scramble {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!isFinePointer() || prefersReducedMotion()) return;
      const text = el.textContent?.trim() ?? '';
      const enter = () =>
        gsap.to(el, {
          duration: 0.6,
          ease: 'none',
          overwrite: true,
          scrambleText: { text, chars: 'upperCase', speed: 0.9, revealDelay: 0.1 },
        });
      el.addEventListener('pointerenter', enter);
      destroyRef.onDestroy(() => el.removeEventListener('pointerenter', enter));
    });
  }
}
