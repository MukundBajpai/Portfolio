import { afterNextRender, DestroyRef, ElementRef, inject } from '@angular/core';
import { gsap } from '../core/gsap';
import { prefersReducedMotion } from '../core/motion';

/**
 * Wires a looping SVG diagram animation to its component: builds it inside a GSAP context,
 * plays it only while on screen, and reverts on destroy. Call from a component constructor.
 *
 * IntersectionObserver (not ScrollTrigger) because project cards are position: sticky,
 * so their on-screen position differs from their layout position.
 */
export function mountDiagram(build: (svg: SVGSVGElement) => gsap.core.Timeline): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const destroyRef = inject(DestroyRef);

  afterNextRender(() => {
    if (prefersReducedMotion()) return;
    const svg = host.querySelector('svg')!;
    let observer: IntersectionObserver | undefined;
    const ctx = gsap.context(() => {
      const timeline = build(svg).pause();
      observer = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? timeline.play() : timeline.pause()),
        { threshold: 0.2 },
      );
      observer.observe(host);
    }, svg);
    destroyRef.onDestroy(() => {
      observer?.disconnect();
      ctx.revert();
    });
  });
}

/** MotionPath vars that move a packet along an SVG path (optionally backwards). */
export function along(path: SVGPathElement, duration: number, reverse = false): gsap.TweenVars {
  return {
    duration,
    ease: 'power1.inOut',
    motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: reverse ? 1 : 0, end: reverse ? 0 : 1 },
  };
}
