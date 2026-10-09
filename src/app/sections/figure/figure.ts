import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from '../../core/gsap';
import { fontsReady, prefersReducedMotion } from '../../core/motion';
import { PaletteService } from '../../core/palette';
import { quality } from '../../core/quality';
import { SmoothScroll } from '../../core/smooth-scroll';
import { collectible, profile } from '../../data/portfolio';
import { Reveal } from '../../shared/reveal';
import { SplitReveal } from '../../shared/split';
import type { FigureEngine } from './figure-engine';
import type { PrintColors, PrintContent } from './figure-prints';

/** Reads the live tokens off the (always dark, `.island`) canvas so the prints match the site. */
function themeColors(canvas: HTMLCanvasElement): PrintColors {
  const style = getComputedStyle(canvas);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    accent: v('--accent'),
    accentSoft: v('--accent-soft'),
    accentDeep: v('--accent-deep'),
    ink: v('--ink'),
    mist: v('--mist'),
    smoke: v('--smoke'),
    signal: v('--signal'),
    onAccent: v('--on-accent'),
  };
}

@Component({
  selector: 'app-figure',
  imports: [Reveal, SplitReveal],
  templateUrl: './figure.html',
  styleUrl: './figure.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Figure {
  protected readonly c = collectible;
  protected readonly profile = profile;
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  protected readonly unboxed = signal(false);
  protected readonly spinning = signal(!prefersReducedMotion());

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly palette = inject(PaletteService);
  private readonly scroll = inject(SmoothScroll);
  private engine?: FigureEngine;
  private approach?: IntersectionObserver;

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      this.palette.current();
      this.engine?.paint(themeColors(this.canvas().nativeElement));
    });
    effect(() => {
      const low = quality() === 'low';
      this.engine?.setQuality(low);
    });

    afterNextRender(() => {
      let cleanup = () => {};
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        this.approach?.disconnect();
        cleanup();
      });
      void this.start().then((stop) => {
        if (destroyed) stop();
        else cleanup = stop;
      });
    });
  }

  protected front(): void {
    this.engine?.showSide('front');
  }

  protected back(): void {
    this.engine?.showSide('back');
  }

  protected unbox(): void {
    if (this.engine) this.unboxed.set(this.engine.toggleUnbox());
  }

  protected toggleSpin(): void {
    this.spinning.update((on) => !on);
    this.engine?.setAutoSpin(this.spinning());
  }

  private async start(): Promise<() => void> {
    const stage = this.stage().nativeElement;
    // Build the 3D scene only as the visitor approaches, so it never competes with the intro.
    await new Promise<void>((resolve) => {
      this.approach = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          this.approach?.disconnect();
          resolve();
        },
        { rootMargin: '900px 0px' },
      );
      this.approach.observe(stage);
    });

    const content: PrintContent = {
      first: profile.firstName,
      last: profile.lastName,
      role: profile.role,
      team: collectible.team,
      series: collectible.series,
      edition: collectible.edition,
      location: profile.location,
      year: new Date().getFullYear(),
      features: collectible.features,
      stats: collectible.stats,
      links: collectible.links,
    };

    let engine: FigureEngine;
    try {
      const [{ FigureEngine }] = await Promise.all([import('./figure-engine'), fontsReady()]);
      const canvas = this.canvas().nativeElement;
      engine = new FigureEngine(canvas, content, themeColors(canvas), quality() === 'low');
      await engine.load(collectible.image, profile.photo ?? undefined);
    } catch {
      this.failed.set(true);
      return () => {};
    }
    this.engine = engine;
    engine.setAutoSpin(this.spinning());
    this.ready.set(true);

    // Only render while the stage is on screen. On low-power devices also hold the frame while the page is
    // scrolling: software WebGL blocks the main thread, and the slow spin simply resumes when scrolling stops.
    let lastScroll = 0;
    const offScroll = this.scroll.onScroll(() => (lastScroll = performance.now()));
    const tick = (_time: number, deltaMs: number) => {
      if (quality() === 'low' && performance.now() - lastScroll < 160) return;
      engine.render(Math.min(deltaMs, 50) / 1000);
    };
    let introduced = prefersReducedMotion();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.ticker.add(tick);
          if (!introduced) {
            introduced = true;
            engine.intro();
          }
        } else {
          gsap.ticker.remove(tick);
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(stage);

    const resize = new ResizeObserver(() => engine.resize());
    resize.observe(stage);

    const local = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return { nx: ((e.clientX - r.left) / r.width) * 2 - 1, ny: ((e.clientY - r.top) / r.height) * 2 - 1 };
    };
    const down = (e: PointerEvent) => {
      stage.setPointerCapture(e.pointerId);
      engine.pointerDown(e.clientX);
    };
    const move = (e: PointerEvent) => {
      const { nx, ny } = local(e);
      engine.pointerMove(e.clientX, e.pointerType === 'mouse' ? nx : 0, e.pointerType === 'mouse' ? ny : 0);
    };
    const up = () => engine.pointerUp();
    const leave = () => engine.pointerLeave();
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('pointerleave', leave);

    return () => {
      offScroll();
      observer.disconnect();
      resize.disconnect();
      gsap.ticker.remove(tick);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('pointerleave', leave);
      engine.dispose();
    };
  }
}
