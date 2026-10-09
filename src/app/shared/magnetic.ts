import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';
import { gsap } from '../core/gsap';
import { isFinePointer, prefersReducedMotion } from '../core/motion';

/** Pulls the element toward the cursor while hovered. Value = pull strength (default 0.35). */
@Directive({ selector: '[appMagnetic]' })
export class Magnetic {
  readonly appMagnetic = input(0.35, { transform: (v: unknown) => numberAttribute(v, 0.35) });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!isFinePointer() || prefersReducedMotion()) return;
      const strength = this.appMagnetic();
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
      let cx = 0;
      let cy = 0;

      const enter = () => {
        const r = el.getBoundingClientRect();
        const x = Number(gsap.getProperty(el, 'x')) || 0;
        const y = Number(gsap.getProperty(el, 'y')) || 0;
        cx = r.left - x + r.width / 2;
        cy = r.top - y + r.height / 2;
      };
      const move = (e: PointerEvent) => {
        xTo((e.clientX - cx) * strength);
        yTo((e.clientY - cy) * strength);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };

      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      destroyRef.onDestroy(() => {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      });
    });
  }
}
