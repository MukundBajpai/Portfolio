import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { gsap, ScrollTrigger } from '../../core/gsap';
import { prefersReducedMotion } from '../../core/motion';
import { SkillGroup, skillGroups } from '../../data/portfolio';
import { Reveal } from '../../shared/reveal';
import { SplitReveal } from '../../shared/split';
import { Spotlight } from '../../shared/spotlight';

const group = (id: SkillGroup['id']): SkillGroup => skillGroups.find((g) => g.id === id)!;

/** Bento grid: every tile gets its own small animated "proof" of the skill. */
@Component({
  selector: 'app-skills',
  imports: [Reveal, SplitReveal, Spotlight],
  templateUrl: './skills.html',
  styleUrl: './skills.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skills {
  protected readonly ai = group('ai');
  protected readonly platforms = group('platforms');
  protected readonly backend = group('backend');
  protected readonly frontend = group('frontend');
  protected readonly languages = group('languages');
  protected readonly cloud = group('cloud');

  /** AI skills over three orbit rings: shortest labels inside, longest on the roomy outer ring. */
  protected readonly orbits = (() => {
    const byLength = [...this.ai.items].sort((a, b) => a.length - b.length);
    return [byLength.slice(0, 3), byLength.slice(3, 6), byLength.slice(6)];
  })();
  /** Doubled so the CSS conveyor can loop at -50%. */
  protected readonly cloudRows = [this.cloud.items.slice(0, 7), this.cloud.items.slice(7)].map((row) => [...row, ...row]);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      const ctx = gsap.context(() => {
        // Per-tile "proof" animations, played as each tile lands.
        const inner = new Map<Element, gsap.core.Animation>([
          [
            host.querySelector('.tile--frontend')!,
            gsap.from(host.querySelectorAll('.sk'), {
              x: () => gsap.utils.random(-70, 70),
              y: () => gsap.utils.random(-50, 50),
              rotation: () => gsap.utils.random(-25, 25),
              opacity: 0,
              duration: 1.2,
              stagger: 0.08,
              ease: 'back.out(1.4)',
              paused: true,
            }),
          ],
          [
            host.querySelector('.tile--backend')!,
            gsap.from(host.querySelectorAll('.code__line'), { opacity: 0, x: -24, duration: 0.8, stagger: 0.12, paused: true }),
          ],
        ]);

        const tiles = gsap.utils.toArray<HTMLElement>('.tile', host);
        gsap.set(tiles, { opacity: 0, y: 90, rotationX: -16, transformPerspective: 1200, transformOrigin: '50% 100%' });
        ScrollTrigger.batch(tiles, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              rotationX: 0,
              duration: 1.4,
              stagger: 0.12,
              clearProps: 'transform,opacity',
            });
            batch.forEach((tile, i) => {
              const animation = inner.get(tile);
              if (animation) gsap.delayedCall(0.45 + i * 0.12, () => void animation.play());
            });
          },
        });

        // Languages tile: slot-machine ticker.
        const track = host.querySelector<HTMLElement>('.ticker__track');
        if (track) {
          const steps = track.children.length - 1;
          const ticker = gsap.timeline({ repeat: -1 });
          for (let k = 1; k <= steps; k++) {
            ticker.to(track, { yPercent: (-100 / (steps + 1)) * k, duration: 0.9, ease: 'expo.inOut' }, '+=1.1');
          }
          ticker.set(track, { yPercent: 0 });
        }
      }, host);
      destroyRef.onDestroy(() => ctx.revert());
    });
  }
}
