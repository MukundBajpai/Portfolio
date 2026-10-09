import { ChangeDetectionStrategy, Component } from '@angular/core';
import { gsap } from '../../../core/gsap';
import { mountDiagram } from '../../../shared/diagram';

const SNAKE = 'M90 96 L510 96 C 575 96, 575 262, 510 262 L90 262';
const BUS_Y = 179;

const PHASES = [
  { code: 'REQ', label: 'Requirements', x: 90, y: 96 },
  { code: 'DSN', label: 'Design', x: 300, y: 96 },
  { code: 'API', label: 'API spec', x: 510, y: 96 },
  { code: '</>', label: 'Code', x: 510, y: 262 },
  { code: 'TST', label: 'Test cases', x: 300, y: 262 },
  { code: 'IaC', label: 'Deploy · IaC', x: 90, y: 262 },
].map((p) => ({ ...p, top: p.y < BUS_Y }));

@Component({
  selector: 'app-sdlc-diagram',
  template: `
    <svg
      class="dg"
      viewBox="0 0 600 420"
      role="img"
      aria-label="AI-DLC pipeline: requirements, design, API spec, code, test cases and deployment IaC share one context bus; overall generation time drops by about 70%"
    >
      <defs>
        <pattern id="sd-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle class="dg-grid" cx="1.5" cy="1.5" r="1" />
        </pattern>
        <linearGradient id="sd-bar" x1="0" x2="1">
          <stop offset="0" style="stop-color: var(--accent-deep)" />
          <stop offset="1" style="stop-color: var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill="url(#sd-dots)" />

      <line class="dg-edge sd-draw sd-bus" x1="50" [attr.y1]="busY" x2="550" [attr.y2]="busY" />
      <text class="dg-sub" x="195" [attr.y]="busY - 7" text-anchor="middle">shared context bus</text>
      <text class="dg-sub" x="405" [attr.y]="busY - 7" text-anchor="middle">prompt chaining</text>
      @for (p of phases; track p.code) {
        <line class="dg-edge sd-draw" [attr.x1]="p.x" [attr.y1]="p.top ? p.y + 34 : p.y - 34" [attr.x2]="p.x" [attr.y2]="busY" />
      }

      <path class="dg-edge sd-draw sd-snake" [attr.d]="snake" />
      <path class="dg-flow" [attr.d]="snake" />

      @for (p of phases; track p.code) {
        <g class="dg-n sd-phase" [attr.data-x]="p.x" [attr.data-y]="p.y">
          <circle class="dg-node" [attr.cx]="p.x" [attr.cy]="p.y" r="34" />
          <text class="sd-code" [attr.x]="p.x" [attr.y]="p.y + 5" text-anchor="middle">{{ p.code }}</text>
          <text class="dg-label" [attr.x]="p.x" [attr.y]="p.top ? p.y - 48 : p.y + 58" text-anchor="middle">
            {{ p.label }}
          </text>
          <g class="sd-done">
            <circle [attr.cx]="p.x + 25" [attr.cy]="p.y - 25" r="8" />
            <path [attr.d]="'M' + (p.x + 21) + ' ' + (p.y - 25) + 'l3 3 5-6'" />
          </g>
        </g>
      }

      <circle class="dg-packet sd-comet" r="6" />

      <text class="dg-sub" x="40" y="338">overall generation time</text>
      <text class="dg-sub" x="40" y="363">before</text>
      <rect class="sd-track" x="110" y="356" width="390" height="8" rx="4" />
      <rect class="sd-before" x="110" y="356" width="390" height="8" rx="4" />
      <text class="dg-sub" x="40" y="389">ai-dlc</text>
      <rect class="sd-track" x="110" y="382" width="390" height="8" rx="4" />
      <rect class="sd-after" x="110" y="382" width="117" height="8" rx="4" fill="url(#sd-bar)" />
      <text class="sd-gain" x="240" y="390">≈ 70% less</text>
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .sd-code {
      fill: var(--ink);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
    }
    .sd-done {
      opacity: 0;
      transform: scale(0.4);
      transform-box: fill-box;
      transform-origin: center;
      transition:
        opacity 0.3s,
        transform 0.5s var(--ease-out-expo);
    }
    .is-done .sd-done {
      opacity: 1;
      transform: none;
    }
    .sd-done circle {
      fill: var(--signal);
    }
    .sd-done path {
      fill: none;
      stroke: var(--void);
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .sd-bus {
      stroke-dasharray: 4 6;
    }
    .sd-comet {
      opacity: 0;
    }
    .sd-track {
      fill: rgb(var(--ink-rgb) / 0.06);
    }
    .sd-before {
      fill: rgb(var(--ink-rgb) / 0.28);
    }
    .sd-gain {
      fill: var(--accent);
      font-size: 11px;
      letter-spacing: 0.08em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SdlcDiagram {
  protected readonly phases = PHASES;
  protected readonly snake = SNAKE;
  protected readonly busY = BUS_Y;

  constructor() {
    mountDiagram((svg) => {
      const snake = svg.querySelector<SVGPathElement>('.sd-snake')!;
      const comet = svg.querySelector<SVGCircleElement>('.sd-comet')!;
      const after = svg.querySelector<SVGRectElement>('.sd-after')!;
      const gain = svg.querySelector<SVGTextElement>('.sd-gain')!;
      const phases = Array.from(svg.querySelectorAll<SVGGElement>('.sd-phase'));

      // Where along the snake the comet passes each phase (0..1).
      const total = snake.getTotalLength();
      const marks = phases.map((g) => {
        const x = Number(g.dataset['x']);
        const y = Number(g.dataset['y']);
        let best = 0;
        let bestDist = Infinity;
        for (let s = 0; s <= 240; s++) {
          const pt = snake.getPointAtLength((s / 240) * total);
          const dist = (pt.x - x) ** 2 + (pt.y - y) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            best = s / 240;
          }
        }
        return best;
      });

      const master = gsap
        .timeline()
        .from(svg.querySelectorAll('.sd-draw'), { drawSVG: '0%', duration: 1.3, stagger: 0.05, ease: 'power2.inOut' })
        .from(
          phases,
          { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.08, ease: 'back.out(1.7)' },
          0.3,
        );

      const ride = gsap.to(comet, {
        duration: 4.2,
        ease: 'none',
        motionPath: { path: snake, align: snake, alignOrigin: [0.5, 0.5] },
        onUpdate: () => {
          const progress = ride.progress();
          phases.forEach((g, k) => {
            const done = progress >= Math.min(marks[k] + 0.03, 0.999);
            g.classList.toggle('is-done', done);
            g.classList.toggle('is-on', !done && progress >= marks[k] - 0.02);
          });
        },
      });

      const loop = gsap
        .timeline({ repeat: -1, repeatDelay: 0.6 })
        .add(() => phases.forEach((g) => g.classList.remove('is-done', 'is-on')))
        .set(after, { attr: { width: 390 } })
        .set(gain, { opacity: 0 })
        .set(comet, { opacity: 1 })
        .add(ride)
        .set(comet, { opacity: 0 })
        .to(after, { attr: { width: 117 }, duration: 1.3, ease: 'expo.out' })
        .to(gain, { opacity: 1, duration: 0.4 }, '-=0.8')
        .to({}, { duration: 1.8 });

      return master.add(loop);
    });
  }
}
