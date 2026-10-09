import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { gsap } from '../../core/gsap';
import { prefersReducedMotion } from '../../core/motion';
import { projects } from '../../data/portfolio';
import { Arrow } from '../../shared/arrow';
import { Reveal } from '../../shared/reveal';
import { SplitReveal } from '../../shared/split';
import { Spotlight } from '../../shared/spotlight';
import { AgentsDiagram } from './diagrams/agents-diagram';
import { BrokerDiagram } from './diagrams/broker-diagram';
import { RateLoadDiagram } from './diagrams/rate-load-diagram';
import { SdlcDiagram } from './diagrams/sdlc-diagram';

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** Case-study cards that pin and stack into a deck (desktop), each with a live system schematic. */
@Component({
  selector: 'app-work',
  imports: [Arrow, Reveal, SplitReveal, Spotlight, AgentsDiagram, SdlcDiagram, RateLoadDiagram, BrokerDiagram],
  templateUrl: './work.html',
  styleUrl: './work.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Work {
  protected readonly projects = projects;
  protected readonly count = WORDS[projects.length] ?? String(projects.length);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1200px) and (min-height: 760px)', () => {
        const slots = Array.from(host.querySelectorAll<HTMLElement>('.work__slot'));
        const last = slots[slots.length - 1];
        const stickyTop = (el: HTMLElement) => parseFloat(getComputedStyle(el).top) || 0;

        slots.slice(0, -1).forEach((slot, i) => {
          const depth = slots.length - 1 - i;
          gsap
            .timeline({
              scrollTrigger: {
                trigger: slots[i + 1],
                start: 'top bottom',
                endTrigger: last,
                end: () => `top ${stickyTop(last)}px`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
            .to(slot.querySelector('.project'), { scale: 1 - depth * 0.045, ease: 'none', transformOrigin: '50% 0%' }, 0)
            .to(slot.querySelector('.project__shade'), { opacity: Math.min(0.2 + depth * 0.18, 0.7), ease: 'none' }, 0);
        });
      });
      destroyRef.onDestroy(() => mm.revert());
    });
  }
}
