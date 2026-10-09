import { ChangeDetectionStrategy, Component } from '@angular/core';
import { gsap } from '../../../core/gsap';
import { mountDiagram } from '../../../shared/diagram';

const SHEET_X = 30;
const COL_W = 64;
const HEAD_Y = 100;
const ROW_Y = 132;
const ROW_H = 28;
const ROLES = ['Territory', 'Class', 'Base rate', 'Limit', 'Eff. date'];
const OVERRIDE = { index: 3, label: 'Sublimit' };
const WIDTHS = [30, 44, 22, 38, 26, 40, 18, 34, 42, 28, 24, 36];

const COLS = ROLES.map((role, k) => ({ role, letter: 'ABCDE'[k], x: SHEET_X + k * COL_W }));
const ROWS = Array.from({ length: 6 }, (_, r) => ({
  y: ROW_Y + r * ROW_H,
  cells: COLS.map((c, k) => ({ x: c.x + 10, w: WIDTHS[(r * 5 + k) % WIDTHS.length] })),
}));
const STEPS = ['Upload', 'Parse · SheetJS', 'Classify', 'Override', 'Validate', 'Load'].map((label, i) => ({
  label,
  y: 160 + i * 28,
}));

@Component({
  selector: 'app-rate-load-diagram',
  template: `
    <svg
      class="dg"
      viewBox="0 0 600 420"
      role="img"
      aria-label="An Excel rate sheet is parsed, Azure OpenAI classifies each column into a business role, a user overrides one label, then the data is validated and loaded"
    >
      <defs>
        <pattern id="rl-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle class="dg-grid" cx="1.5" cy="1.5" r="1" />
        </pattern>
        <linearGradient id="rl-beam" x1="0" x2="1">
          <stop offset="0" style="stop-color: var(--accent)" stop-opacity="0" />
          <stop offset="0.5" style="stop-color: var(--accent)" stop-opacity="0.32" />
          <stop offset="1" style="stop-color: var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill="url(#rl-dots)" />

      <path class="dg-edge" d="M350 116 C 366 116, 364 93, 380 93" />
      <path class="dg-flow" d="M350 116 C 366 116, 364 93, 380 93" />

      <!-- role chips -->
      @for (c of cols; track c.letter) {
        <g class="rl-chip">
          <rect [attr.x]="c.x + 4" y="64" width="56" height="22" rx="11" />
          <text [attr.x]="c.x + 32" y="78.5" text-anchor="middle">{{ c.role }}</text>
        </g>
      }

      <!-- sheet -->
      <rect class="dg-node" [attr.x]="sheetX" [attr.y]="headY" width="320" height="200" rx="10" />
      <line class="rl-rule" [attr.x1]="sheetX" [attr.y1]="rowY" [attr.x2]="sheetX + 320" [attr.y2]="rowY" />
      @for (c of cols; track c.letter) {
        @if (!$first) {
          <line class="rl-rule" [attr.x1]="c.x" [attr.y1]="headY" [attr.x2]="c.x" [attr.y2]="headY + 200" />
        }
        <text class="dg-sub" [attr.x]="c.x + 32" [attr.y]="headY + 21" text-anchor="middle">{{ c.letter }}</text>
        <rect class="rl-valid" [attr.x]="c.x + 6" [attr.y]="rowY - 3" width="52" height="2" rx="1" />
      }
      @for (row of rows; track row.y) {
        <g class="rl-row">
          @for (cell of row.cells; track $index) {
            <rect class="rl-cell" [attr.x]="cell.x" [attr.y]="row.y + 11" [attr.width]="cell.w" height="6" rx="3" />
          }
        </g>
      }
      <rect class="rl-beam" [attr.x]="sheetX" [attr.y]="headY" width="64" height="200" fill="url(#rl-beam)" />

      <!-- downstream load -->
      <text class="dg-sub" [attr.x]="sheetX" y="336">downstream load</text>
      <rect class="rl-track" [attr.x]="sheetX" y="346" width="320" height="6" rx="3" />
      <rect class="rl-load" [attr.x]="sheetX" y="346" width="320" height="6" rx="3" />

      <!-- classifier + steps -->
      <g class="dg-n rl-ai">
        <rect class="dg-node" x="380" y="64" width="200" height="58" rx="12" />
        <circle class="rl-ai-dot" cx="400" cy="93" r="5" />
        <text class="dg-label" x="416" y="90">Azure OpenAI</text>
        <text class="dg-sub" x="416" y="106">column classifier</text>
      </g>
      @for (s of steps; track s.label) {
        <g class="rl-step">
          <circle class="rl-ring" cx="392" [attr.cy]="s.y" r="8" />
          <path class="rl-check" [attr.d]="'M388 ' + s.y + 'l3 3 5-6'" />
          <text x="410" [attr.y]="s.y + 4">{{ s.label }}</text>
        </g>
      }

      <!-- user cursor for the manual override -->
      <path class="rl-cursor" d="M0 0 L0 16 L4.5 12 L7.5 19 L10 18 L7 11 L13 11 Z" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .rl-rule {
      stroke: rgb(var(--ink-rgb) / 0.1);
    }
    .rl-cell {
      fill: rgb(var(--ink-rgb) / 0.18);
    }
    .rl-beam {
      opacity: 0;
    }
    .rl-chip rect {
      fill: var(--accent);
      transition: fill 0.4s;
    }
    .rl-chip text {
      fill: var(--on-accent);
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .rl-chip.is-override rect {
      fill: var(--signal);
    }
    .rl-valid {
      fill: var(--signal);
    }
    .rl-track {
      fill: rgb(var(--ink-rgb) / 0.06);
    }
    .rl-load {
      fill: var(--accent);
    }
    .rl-ai-dot {
      fill: var(--accent);
      filter: drop-shadow(0 0 6px rgb(var(--accent-rgb)));
    }
    .rl-ring {
      fill: none;
      stroke: var(--line-strong);
      transition:
        fill 0.35s,
        stroke 0.35s;
    }
    .rl-check {
      fill: none;
      stroke: var(--void);
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .rl-step text {
      fill: var(--smoke);
      font-size: 11.5px;
      transition: fill 0.35s;
    }
    .rl-step.is-done .rl-ring {
      fill: var(--signal);
      stroke: var(--signal);
    }
    .rl-step.is-done .rl-check {
      opacity: 1;
    }
    .rl-step.is-done text {
      fill: var(--ink);
    }
    .rl-cursor {
      fill: var(--ink);
      stroke: var(--void);
      stroke-width: 1;
      opacity: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateLoadDiagram {
  protected readonly cols = COLS;
  protected readonly rows = ROWS;
  protected readonly steps = STEPS;
  protected readonly sheetX = SHEET_X;
  protected readonly headY = HEAD_Y;
  protected readonly rowY = ROW_Y;

  constructor() {
    mountDiagram((svg) => {
      const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
      const chips = all<SVGGElement>('.rl-chip');
      const chipOverride = chips[OVERRIDE.index];
      const chipText = chipOverride.querySelector('text')!;
      const steps = all<SVGGElement>('.rl-step');
      const rows = all<SVGGElement>('.rl-row');
      const beam = svg.querySelector('.rl-beam')!;
      const load = svg.querySelector('.rl-load')!;
      const ai = svg.querySelector('.rl-ai')!;
      const cursor = svg.querySelector('.rl-cursor')!;
      const done = (i: number) => () => steps[i].classList.add('is-done');

      const tl = gsap
        .timeline({ repeat: -1, repeatDelay: 1 })
        .add(() => {
          steps.forEach((s) => s.classList.remove('is-done'));
          chipOverride.classList.remove('is-override');
          chipText.textContent = ROLES[OVERRIDE.index];
        })
        .set(chips, { scale: 0, transformOrigin: '50% 50%' })
        .set(rows, { opacity: 0, x: 0 })
        .set(load, { attr: { width: 0 } })
        .set(all('.rl-valid'), { scaleX: 0, transformOrigin: '0% 50%' })
        .set(beam, { x: 0, opacity: 0 })
        .set(cursor, { x: 560, y: 390, opacity: 0 })
        .add(done(0), '+=0.3')
        .to(rows, { opacity: 1, duration: 0.35, stagger: 0.08 })
        .add(done(1))
        .add(() => ai.classList.add('is-on'))
        .set(beam, { opacity: 1 });

      COLS.forEach((_, k) => {
        tl.to(beam, { x: k * COL_W, duration: k ? 0.36 : 0.01, ease: 'power2.inOut' }).to(
          chips[k],
          { scale: 1, duration: 0.45, ease: 'back.out(2.2)' },
          '-=0.05',
        );
      });

      tl.to(beam, { opacity: 0, duration: 0.3 })
        .add(() => ai.classList.remove('is-on'))
        .add(done(2))
        .to(cursor, { opacity: 1, duration: 0.2 })
        .to(cursor, { x: COLS[OVERRIDE.index].x + 38, y: 80, duration: 0.9, ease: 'power3.inOut' })
        .to(cursor, { scale: 0.8, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: '0% 0%' })
        .add(() => {
          chipText.textContent = OVERRIDE.label;
          chipOverride.classList.add('is-override');
        })
        .add(done(3))
        .to(cursor, { opacity: 0, duration: 0.3 }, '+=0.25')
        .to(all('.rl-valid'), { scaleX: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out' })
        .add(done(4))
        .to(load, { attr: { width: 320 }, duration: 1.1, ease: 'power2.inOut' })
        .to(rows, { x: 14, opacity: 0.25, duration: 0.6, stagger: 0.06, ease: 'power2.in' }, '<')
        .add(done(5))
        .to({}, { duration: 1.6 });

      return gsap
        .timeline()
        .from(svg.querySelectorAll('.dg-node, .rl-step'), { opacity: 0, y: 12, duration: 0.8, stagger: 0.05 })
        .add(tl);
    });
  }
}
