import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { gsap } from '../../core/gsap';
import { isFinePointer } from '../../core/motion';

const INTERACTIVE = '[data-cursor], a, button, input, textarea, select, label';

/** Ring + dot cursor. Elements with data-cursor="Label" turn it into a labelled accent bubble. */
@Component({
  selector: 'app-cursor',
  template: `
    <div #ring class="cursor is-hidden" aria-hidden="true">
      <span class="cursor__ring"></span>
      <span #label class="cursor__label"></span>
    </div>
    <div #dot class="cursor-dot is-hidden" aria-hidden="true"></div>
  `,
  styleUrl: './cursor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cursor {
  private readonly ring = viewChild.required<ElementRef<HTMLElement>>('ring');
  private readonly dot = viewChild.required<ElementRef<HTMLElement>>('dot');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (!isFinePointer()) return;
      const ring = this.ring().nativeElement;
      const dot = this.dot().nativeElement;
      const label = this.label().nativeElement;
      const html = document.documentElement;
      html.classList.add('has-cursor');

      gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });
      const ringX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3.out' });
      const ringY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3.out' });
      const dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
      const dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
      let seen = false;

      const move = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (!seen) {
          seen = true;
          gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
        }
        ringX(e.clientX);
        ringY(e.clientY);
        dotX(e.clientX);
        dotY(e.clientY);
        ring.classList.remove('is-hidden');
        dot.classList.remove('is-hidden');
      };
      const over = (e: PointerEvent) => {
        const target = (e.target as Element | null)?.closest<HTMLElement>(INTERACTIVE);
        const text = target?.dataset['cursor'];
        ring.classList.toggle('is-label', !!text);
        ring.classList.toggle('is-hover', !!target && !text);
        ring.classList.toggle('is-text', !!target?.matches('input, textarea, select'));
        dot.classList.toggle('is-muted', !!target);
        if (text) label.textContent = text;
      };
      const out = (e: MouseEvent) => {
        if (e.relatedTarget) return;
        ring.classList.add('is-hidden');
        dot.classList.add('is-hidden');
      };
      const down = () => ring.classList.add('is-down');
      const up = () => ring.classList.remove('is-down');

      window.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerover', over, { passive: true });
      document.addEventListener('mouseout', out);
      window.addEventListener('pointerdown', down);
      window.addEventListener('pointerup', up);

      destroyRef.onDestroy(() => {
        html.classList.remove('has-cursor');
        window.removeEventListener('pointermove', move);
        document.removeEventListener('pointerover', over);
        document.removeEventListener('mouseout', out);
        window.removeEventListener('pointerdown', down);
        window.removeEventListener('pointerup', up);
      });
    });
  }
}
