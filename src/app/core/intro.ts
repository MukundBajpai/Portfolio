import { Injectable, signal } from '@angular/core';

/** Coordinates the preloader hand-off so the hero reveal starts as the curtain lifts. */
@Injectable({ providedIn: 'root' })
export class Intro {
  readonly done = signal(false);
  private resolveFinished!: () => void;
  readonly finished = new Promise<void>((resolve) => (this.resolveFinished = resolve));

  complete(): void {
    if (this.done()) return;
    this.done.set(true);
    this.resolveFinished();
  }
}
