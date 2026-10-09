import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Button arrow that slides out while its twin slides in on hover (styled by `.btn__icon`). */
@Component({
  selector: 'app-arrow',
  template: `
    <span class="btn__icon" [attr.data-dir]="dir()" aria-hidden="true">
      <svg viewBox="0 0 16 16"><path d="M4.5 11.5 11.5 4.5M11.5 4.5H5.8M11.5 4.5v5.7" /></svg>
      <svg viewBox="0 0 16 16"><path d="M4.5 11.5 11.5 4.5M11.5 4.5H5.8M11.5 4.5v5.7" /></svg>
    </span>
  `,
  styles: ':host { display: contents; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Arrow {
  readonly dir = input<'up-right' | 'down-right' | 'down'>('up-right');
}
