import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap, ScrollTrigger } from '../../core/gsap';
import { Intro } from '../../core/intro';
import { fontsReady, prefersReducedMotion } from '../../core/motion';
import { SmoothScroll } from '../../core/smooth-scroll';

const LOG = ['initialising agents', 'loading embeddings', 'grounding context', 'orchestrating scene', 'ready'];

@Component({
  selector: 'app-preloader',
  templateUrl: './preloader.html',
  styleUrl: './preloader.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preloader {
  protected readonly visible = signal(true);
  protected readonly firstLog = LOG[0];
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly count = viewChild.required<ElementRef<HTMLElement>>('count');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly status = viewChild.required<ElementRef<HTMLElement>>('status');
  private readonly intro = inject(Intro);
  private readonly scroll = inject(SmoothScroll);

  constructor() {
    history.scrollRestoration = 'manual';
    afterNextRender(() => this.run());
  }

  private run(): void {
    this.scroll.stop();
    window.scrollTo(0, 0);
    if (prefersReducedMotion()) {
      this.finish();
      return;
    }

    const countEl = this.count().nativeElement;
    const barEl = this.bar().nativeElement;
    const statusEl = this.status().nativeElement;
    const counter = { v: 0 };
    let logIndex = 0;

    const counting = gsap.to(counter, {
      v: 100,
      duration: 2.1,
      ease: 'power2.inOut',
      onUpdate: () => {
        countEl.textContent = String(Math.round(counter.v)).padStart(3, '0');
        barEl.style.transform = `scaleX(${counter.v / 100})`;
        const next = Math.min(LOG.length - 1, Math.floor(counter.v / (100 / (LOG.length - 1))));
        if (next !== logIndex) {
          logIndex = next;
          statusEl.textContent = LOG[next];
        }
      },
    });

    void Promise.all([counting.then(), fontsReady()]).then(() => this.exit());
  }

  private exit(): void {
    const root = this.root().nativeElement;
    gsap
      .timeline({ onComplete: () => this.finish() })
      .to(root.querySelectorAll('[data-out]'), {
        yPercent: -120,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.in',
        stagger: 0.05,
      })
      .add(() => this.intro.complete(), '-=0.2')
      .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.25, ease: 'expo.inOut' }, '<');
  }

  private finish(): void {
    this.intro.complete();
    this.visible.set(false);
    this.scroll.start();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }
}
