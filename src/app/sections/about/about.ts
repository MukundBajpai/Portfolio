import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { gsap, SplitText } from '../../core/gsap';
import { fontsReady, prefersReducedMotion } from '../../core/motion';
import { bio, idCard, manifesto, profile, stats } from '../../data/portfolio';
import { CountUp } from '../../shared/count-up';
import { Reveal } from '../../shared/reveal';
import { Tilt } from '../../shared/tilt';

@Component({
  selector: 'app-about',
  imports: [CountUp, Reveal, Tilt],
  templateUrl: './about.html',
  styleUrl: './about.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly profile = profile;
  protected readonly manifesto = manifesto;
  protected readonly bio = bio;
  protected readonly stats = stats;
  protected readonly fields = idCard;
  private readonly statement = viewChild.required<ElementRef<HTMLElement>>('statement');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      let split: SplitText | undefined;
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        split?.revert();
      });

      // Words light up one by one, scrubbed to scroll position.
      void fontsReady().then(() => {
        if (destroyed) return;
        const el = this.statement().nativeElement;
        split = SplitText.create(el, {
          type: 'words',
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              self.words,
              { opacity: 0.12 },
              {
                opacity: 1,
                ease: 'none',
                stagger: 0.1,
                scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
              },
            ),
        });
      });
    });
  }
}
