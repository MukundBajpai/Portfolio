import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { isFinePointer } from '../core/motion';

/** Feeds pointer coordinates to CSS (--mx/--my) for the `.spotlight` border/surface glow. */
@Directive({ selector: '[appSpotlight]' })
export class Spotlight {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!isFinePointer()) return;
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      };
      el.addEventListener('pointermove', move, { passive: true });
      destroyRef.onDestroy(() => el.removeEventListener('pointermove', move));
    });
  }
}
