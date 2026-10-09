import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { gsap, ScrollTrigger } from '../../core/gsap';
import { Intro } from '../../core/intro';
import { prefersReducedMotion } from '../../core/motion';
import { PaletteService } from '../../core/palette';
import { quality } from '../../core/quality';
import { ThemeState } from '../../core/theme-state';
import type { FieldState, ParticleEngine } from './particle-engine';

interface Mark {
  top: number;
  shape: number;
  glow: number;
  shift: number;
  lift: number;
}

/**
 * Fixed WebGL backdrop. Sections opt in with data-shape / data-glow / data-shift / data-lift; as each
 * section's top rises through the lower 65% of the viewport the swarm morphs into its shape.
 */
@Component({
  selector: 'app-particle-field',
  template: `
    <div class="field-glow" aria-hidden="true"></div>
    <canvas #canvas class="field" aria-hidden="true"></canvas>
  `,
  styles: `
    :host {
      display: contents;
    }
    .field,
    .field-glow {
      position: fixed;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100lvh;
      pointer-events: none;
    }
    .field-glow {
      background:
        radial-gradient(38% 48% at 72% 44%, rgb(var(--accent-rgb) / 0.12), transparent 70%),
        radial-gradient(30% 40% at 18% 80%, rgb(var(--signal-rgb) / 0.05), transparent 70%);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticleField {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly intro = inject(Intro);
  private readonly palette = inject(PaletteService);
  private readonly theme = inject(ThemeState);
  private engine?: ParticleEngine;

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      const palette = this.palette.current();
      this.engine?.setPalette(palette);
    });
    effect(() => {
      const light = this.theme.theme() === 'light';
      this.engine?.setTheme(light);
    });
    effect(() => {
      const low = quality() === 'low';
      this.engine?.setQuality(low);
    });

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      let dispose = () => {};
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        dispose();
      });

      void import('./particle-engine').then(({ ParticleEngine }) => {
        if (destroyed) return;
        let engine: ParticleEngine;
        try {
          engine = new ParticleEngine(
            this.canvas().nativeElement,
            this.palette.current(),
            this.theme.theme() === 'light',
            quality() === 'low',
          );
        } catch {
          return; // No WebGL: the CSS glow underneath stays as the backdrop.
        }
        this.engine = engine;
        dispose = this.drive(engine);
      });
    });
  }

  private drive(engine: ParticleEngine): () => void {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-shape]'));
    let marks: Mark[] = [];
    const measure = () => {
      marks = sections.map((el) => {
        const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
        return {
          top: box.getBoundingClientRect().top + window.scrollY,
          shape: Number(el.dataset['shape']),
          glow: Number(el.dataset['glow'] ?? 1),
          shift: Number(el.dataset['shift'] ?? 0),
          lift: Number(el.dataset['lift'] ?? 0),
        };
      });
    };
    measure();

    const state: FieldState = { from: 0, to: 0, t: 0, glow: 1, shift: 0, lift: 0 };
    const tick = (time: number) => {
      if (!marks.length) return;
      const vh = window.innerHeight;
      const edge = window.scrollY + vh;
      let j = 0;
      for (let k = 1; k < marks.length; k++) if (marks[k].top <= edge) j = k;

      if (j === 0) {
        state.from = state.to = marks[0].shape;
        state.t = 0;
        state.glow = marks[0].glow;
        state.shift = marks[0].shift;
        state.lift = marks[0].lift;
      } else {
        const a = marks[j - 1];
        const b = marks[j];
        const t = gsap.utils.clamp(0, 1, (edge - b.top) / (vh * 0.65));
        state.from = a.shape;
        state.to = b.shape;
        state.t = t;
        state.glow = a.glow + (b.glow - a.glow) * t;
        state.shift = a.shift + (b.shift - a.shift) * t;
        state.lift = a.lift + (b.lift - a.lift) * t;
      }
      engine.render(state, time);
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      engine.pointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) engine.pointerLeave();
    };
    const onResize = () => engine.resize();

    gsap.ticker.add(tick);
    ScrollTrigger.addEventListener('refresh', measure);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('mouseout', onLeave);
    window.addEventListener('resize', onResize);

    const assemble = gsap.to(engine.intro, { value: 0, duration: 3.2, ease: 'expo.out', paused: true });
    void this.intro.finished.then(() => assemble.play());

    return () => {
      assemble.kill();
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener('refresh', measure);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('mouseout', onLeave);
      window.removeEventListener('resize', onResize);
      engine.dispose();
    };
  }
}
