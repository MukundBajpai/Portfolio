import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, numberAttribute } from '@angular/core';
import { gsap } from '../core/gsap';
import { isFinePointer, prefersReducedMotion } from '../core/motion';

/**
 * 3D tilt toward the cursor. Exposes --px/--py (glare position, %) and --tx/--ty (-0.5..0.5)
 * so CSS can move highlights and cast the shadow away from the "light".
 */
@Directive({ selector: '[appTilt]' })
export class Tilt {
  readonly appTilt = input(10, { transform: (v: unknown) => numberAttribute(v, 10) });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!isFinePointer() || prefersReducedMotion()) return;
      const max = this.appTilt();
      gsap.set(el, { transformPerspective: 1100 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      const light = { x: 0.5, y: 0.5 };
      const paint = () => {
        el.style.setProperty('--px', `${light.x * 100}%`);
        el.style.setProperty('--py', `${light.y * 100}%`);
        el.style.setProperty('--tx', (light.x - 0.5).toFixed(3));
        el.style.setProperty('--ty', (light.y - 0.5).toFixed(3));
      };
      const lx = gsap.quickTo(light, 'x', { duration: 0.6, ease: 'power3.out', onUpdate: paint });
      const ly = gsap.quickTo(light, 'y', { duration: 0.6, ease: 'power3.out', onUpdate: paint });

      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
        const py = gsap.utils.clamp(0, 1, (e.clientY - r.top) / r.height);
        ry((px - 0.5) * max * 2);
        rx((0.5 - py) * max * 2);
        lx(px);
        ly(py);
        el.classList.add('is-tilting');
      };
      const leave = () => {
        rx(0);
        ry(0);
        lx(0.5);
        ly(0.5);
        el.classList.remove('is-tilting');
      };

      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      destroyRef.onDestroy(() => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      });
    });
  }
}
