import { Injectable } from '@angular/core';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { prefersReducedMotion } from './motion';

export interface ScrollState {
  scroll: number;
  velocity: number;
  direction: number;
  progress: number;
}

type ScrollListener = (state: ScrollState) => void;

@Injectable({ providedIn: 'root' })
export class SmoothScroll {
  // Motion preference is resolved by prefersReducedMotion() (OS + on-page toggle), not Lenis's own OS check.
  private readonly lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.95,
    smoothWheel: !prefersReducedMotion(),
    respectReducedMotion: false,
    stopInertiaOnNavigate: true,
  });
  private readonly listeners = new Set<ScrollListener>();

  constructor() {
    this.lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update();
      const state: ScrollState = {
        scroll: l.scroll,
        velocity: l.velocity,
        direction: l.direction,
        progress: l.progress,
      };
      this.listeners.forEach((fn) => fn(state));
    });
    gsap.ticker.add((time) => this.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  get velocity(): number {
    return this.lenis.velocity;
  }

  onScroll(fn: ScrollListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  scrollTo(target: string | number | HTMLElement, immediate = false): void {
    this.lenis.scrollTo(target, {
      duration: 1.6,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      immediate,
      force: true,
    });
  }

  stop(): void {
    this.lenis.stop();
  }

  start(): void {
    this.lenis.start();
  }
}
