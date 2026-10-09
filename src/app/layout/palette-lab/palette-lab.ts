import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PaletteService } from '../../core/palette';
import { PALETTE_GROUPS, PALETTES } from '../../core/palettes';

/** Theme picker for comparing colour combinations live. Shown only when environment.themePicker is true. */
@Component({
  selector: 'app-palette-lab',
  template: `
    @if (enabled) {
      <div class="lab">
        @if (open()) {
          <div class="lab__panel glass" role="dialog" aria-label="Colour themes" data-lenis-prevent>
            <header class="lab__head">
              <span class="mono">Pick a theme</span>
              <span class="mono lab__hint">← → cycle · Esc close</span>
            </header>
            @for (group of groups; track group.name) {
              <p class="lab__group mono">{{ group.name }}</p>
              <div class="lab__grid">
                @for (p of group.items; track p.id) {
                  <button
                    type="button"
                    class="lab__swatch"
                    [class.is-on]="palette.current().id === p.id"
                    [attr.aria-pressed]="palette.current().id === p.id"
                    [style.--a]="p.vars['--accent']"
                    [style.--b]="p.vars['--accent-2']"
                    (click)="palette.apply(p.id)"
                  >
                    <i class="lab__dot"></i><span>{{ p.name }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }
        <button
          type="button"
          class="lab__toggle glass mono"
          [attr.aria-expanded]="open()"
          [style.--a]="palette.current().vars['--accent']"
          [style.--b]="palette.current().vars['--accent-2']"
          (click)="open.set(!open())"
        >
          <i class="lab__dot"></i>Theme · {{ palette.current().name }}
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .lab {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 95;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.6rem;
    }
    .lab__toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.6rem 0.95rem 0.6rem 0.65rem;
      border-radius: 999px;
      font-size: 0.64rem;
      color: var(--ink);
    }
    .lab__panel {
      width: min(24rem, calc(100vw - 2rem));
      max-height: min(34rem, 72vh);
      overflow-y: auto;
      padding: 1rem;
      border-radius: 1.2rem;
      background: rgb(12 12 12 / 0.92);
    }
    .lab__head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.62rem;
      color: var(--ink);
    }
    .lab__hint {
      color: var(--smoke);
    }
    .lab__group {
      margin: 1rem 0 0.5rem;
      font-size: 0.56rem;
      color: var(--smoke);
    }
    .lab__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;
    }
    .lab__swatch {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 0.65rem;
      border-radius: 0.8rem;
      border: 1px solid var(--line);
      background: var(--tint);
      font-size: 0.72rem;
      text-align: left;
      color: var(--mist);
      transition:
        border-color 0.3s,
        color 0.3s,
        background-color 0.3s;
    }
    .lab__swatch:hover {
      color: var(--ink);
      border-color: var(--line-strong);
    }
    .lab__swatch.is-on {
      color: var(--ink);
      border-color: var(--a);
      background: var(--tint-2);
    }
    .lab__dot {
      flex: none;
      width: 1.05rem;
      height: 1.05rem;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--a) 50%, var(--b) 50%);
      box-shadow:
        0 0 0 1px var(--line-strong),
        0 0 14px -2px var(--a);
    }
  `,
  host: { '(document:keydown)': 'onKey($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaletteLab {
  protected readonly enabled = environment.themePicker;
  protected readonly palette = inject(PaletteService);
  protected readonly open = signal(false);
  protected readonly groups = PALETTE_GROUPS.map((name) => ({ name, items: PALETTES.filter((p) => p.group === name) }));

  protected onKey(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') this.open.set(false);
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const i = PALETTES.findIndex((p) => p.id === this.palette.current().id);
    const next = PALETTES[(i + (event.key === 'ArrowRight' ? 1 : -1) + PALETTES.length) % PALETTES.length];
    this.palette.apply(next.id);
  }
}
