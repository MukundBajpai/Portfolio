import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { gsap, SplitText } from '../core/gsap';
import { fontsReady, prefersReducedMotion } from '../core/motion';

type SplitKind = 'lines' | 'words' | 'chars';

/** Masked text reveal: lines/words/chars rise out of their line masks when scrolled into view. */
@Directive({ selector: '[appSplit]' })
export class SplitReveal {
  readonly appSplit = input<SplitKind | ''>('');
  readonly splitDelay = input(0);
  readonly splitStart = input('top 85%');

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      let split: SplitText | undefined;
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        split?.revert();
      });

      void fontsReady().then(() => {
        if (destroyed) return;
        const kind = this.appSplit() || 'lines';
        split = SplitText.create(el, {
          type: kind === 'lines' ? 'lines' : `lines,${kind}`,
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(kind === 'chars' ? self.chars : kind === 'words' ? self.words : self.lines, {
              yPercent: 118,
              rotate: kind === 'lines' ? 0 : 5,
              transformOrigin: '0% 100%',
              duration: 1.45,
              stagger: kind === 'chars' ? 0.022 : kind === 'words' ? 0.045 : 0.12,
              delay: this.splitDelay(),
              scrollTrigger: { trigger: el, start: this.splitStart(), once: true },
            }),
        });
      });
    });
  }
}
