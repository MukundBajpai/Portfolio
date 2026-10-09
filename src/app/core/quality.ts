import { signal } from '@angular/core';
import { gsap } from './gsap';

export type Quality = 'high' | 'low';

/**
 * Rendering tier. 'low' keeps the same design but renders it cheaper (1x WebGL resolution, 30fps canvases,
 * fewer particles, lighter shadows, no backdrop blur). Chosen up front for software/weak GPUs and switched
 * at runtime if the page can't hold a smooth frame rate. Never switches back up during a visit.
 */
export const quality = signal<Quality>('high');

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;

function probe(): Quality {
  try {
    const canvas = document.createElement('canvas');
    // Browsers refuse this flag when they'd have to render WebGL on the CPU.
    const gl = (canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })) as WebGLRenderingContext | null;
    if (!gl) return 'low';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (SOFTWARE_GPU.test(renderer)) return 'low';
  } catch {
    return 'low';
  }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return (navigator.hardwareConcurrency || 4) <= 2 || memory <= 2 ? 'low' : 'high';
}

function apply(tier: Quality): void {
  quality.set(tier);
  document.documentElement.classList.toggle('low-power', tier === 'low');
}

/** Before first paint (main.ts), so a weak GPU never renders the expensive version at all. */
export function initQuality(): void {
  apply(probe());
}

/** Drops to 'low' if frames stay slower than ~30fps for two seconds straight. */
export function watchFrameRate(): () => void {
  if (quality() === 'low') return () => {};
  let started = performance.now();
  let frames = 0;
  let spent = 0;
  let slowWindows = 0;
  const tick = (_time: number, delta: number) => {
    // Ignore the first seconds (intro, lazy chunks) and huge gaps (tab switches, debugger).
    if (performance.now() - started < 3500 || delta > 250) return;
    frames++;
    spent += delta;
    if (spent < 2000) return;
    slowWindows = spent / frames > 34 ? slowWindows + 1 : 0;
    frames = 0;
    spent = 0;
    if (slowWindows >= 2) {
      gsap.ticker.remove(tick);
      apply('low');
    }
  };
  const onVisible = () => {
    if (!document.hidden) started = performance.now();
  };
  gsap.ticker.add(tick);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    gsap.ticker.remove(tick);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
