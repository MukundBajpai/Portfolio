import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { motionChoice, saveMotionChoice, systemPrefersReducedMotion } from '../../core/motion';

/** Shown once when the OS asks for reduced motion: explains the calmer version and offers the full one. */
@Component({
  selector: 'app-motion-notice',
  template: `
    @if (visible()) {
      <div class="notice glass" role="status">
        <span class="notice__dot" aria-hidden="true"></span>
        <p class="notice__text">Animations are reduced by your system settings.</p>
        <button type="button" class="notice__enable mono" (click)="enable()">Enable motion</button>
        <button type="button" class="notice__close" aria-label="Keep reduced motion" (click)="dismiss()">✕</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .notice {
      position: fixed;
      left: 50%;
      bottom: 1.25rem;
      z-index: 90;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      width: max-content;
      max-width: calc(100vw - 2rem);
      padding: 0.55rem 0.55rem 0.55rem 1rem;
      border-radius: 999px;
      translate: -50% 0;
      box-shadow:
        var(--shadow-deep),
        0 0 0 1px rgb(var(--accent-rgb) / 0.25);
    }
    .notice__dot {
      flex: none;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
    }
    .notice__text {
      font-size: 0.82rem;
      color: var(--mist);
    }
    .notice__enable {
      flex: none;
      padding: 0.6rem 1rem;
      border-radius: 999px;
      background: var(--ink);
      color: var(--void);
      font-size: 0.64rem;
    }
    .notice__close {
      flex: none;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      color: var(--smoke);
    }
    .notice__close:hover {
      color: var(--ink);
    }
    @media (max-width: 639px) {
      .notice {
        bottom: 4rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotionNotice {
  protected readonly visible = signal(
    environment.respectReducedMotion && motionChoice() === null && systemPrefersReducedMotion(),
  );

  protected enable(): void {
    saveMotionChoice('full');
  }

  protected dismiss(): void {
    saveMotionChoice('reduced', false);
    this.visible.set(false);
  }
}
