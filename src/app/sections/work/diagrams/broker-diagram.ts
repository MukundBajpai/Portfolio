import { ChangeDetectionStrategy, Component } from '@angular/core';
import { gsap } from '../../../core/gsap';
import { mountDiagram } from '../../../shared/diagram';

const NAV = [64, 52, 58, 46, 60];
const STEPS = ['details', 'property', 'coverage', 'quote'].map((label, i) => ({ label, x: 172 + i * 125.3 }));
const BARS = [28, 46, 34, 58, 50, 70, 56].map((h, i) => ({ x: 374 + i * 29, h }));
const DOCS = [
  { name: 'quote-2291.pdf', status: 'exported ✓', y: 326 },
  { name: 'broker email', status: 'sent ✓', y: 356 },
  { name: 'policy documents', status: 'attached ✓', y: 386 },
];
const SEARCH = 'Q-2291 · coastal home';
const PREMIUM = 1284;

@Component({
  selector: 'app-broker-diagram',
  template: `
    <svg
      class="dg"
      viewBox="0 0 600 420"
      role="img"
      aria-label="Broker portal: a quote moves through details, property, coverage and quote steps, the premium is calculated, analytics update, the property is pinned on a flood-zone map and the PDF is exported and emailed"
    >
      <defs>
        <linearGradient id="br-avatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style="stop-color: var(--accent-2)" />
          <stop offset="1" style="stop-color: var(--accent-deep)" />
        </linearGradient>
        <clipPath id="br-map">
          <rect x="132" y="280" width="214" height="124" rx="12" />
        </clipPath>
      </defs>

      <!-- sidebar -->
      <rect class="dg-node" x="16" y="16" width="104" height="388" rx="14" />
      <circle cx="40" cy="44" r="9" fill="url(#br-avatar)" />
      <text class="dg-label" x="56" y="48" style="font-size: 11px">MARINE</text>
      @for (w of nav; track $index) {
        <rect class="br-nav" [class.br-nav--on]="$first" x="32" [attr.y]="84 + $index * 26" [attr.width]="w" height="8" rx="4" />
      }
      <rect class="br-role" x="30" y="364" width="76" height="24" rx="12" />
      <text class="br-role-text" x="68" y="380" text-anchor="middle">broker</text>

      <!-- top bar -->
      <rect class="dg-node" x="132" y="16" width="452" height="44" rx="12" />
      <rect class="br-search" x="146" y="26" width="240" height="24" rx="12" />
      <circle class="br-search-icon" cx="161" cy="38" r="4.5" />
      <text class="dg-sub br-typed" x="174" y="41.5">{{ search }}</text>
      <circle cx="560" cy="38" r="12" fill="url(#br-avatar)" />

      <!-- stepper -->
      <line class="br-step-track" x1="172" y1="92" x2="548" y2="92" />
      <line class="br-step-fill" x1="172" y1="92" x2="548" y2="92" />
      @for (s of steps; track s.label) {
        <g class="br-step">
          <circle [attr.cx]="s.x" cy="92" r="9" />
          <text class="dg-sub" [attr.x]="s.x" y="119" text-anchor="middle">{{ s.label }}</text>
        </g>
      }

      <!-- quote -->
      <rect class="dg-node" x="132" y="140" width="214" height="128" rx="12" />
      <text class="dg-sub" x="148" y="164">annual premium</text>
      <text class="br-premium" x="148" y="210">{{ premium }}</text>
      <text class="dg-sub" x="148" y="232">quote q-2291 · valid 30 days</text>
      <text class="br-ok" x="148" y="254">premium calculated ✓</text>

      <!-- analytics -->
      <rect class="dg-node" x="356" y="140" width="228" height="128" rx="12" />
      <text class="dg-sub" x="372" y="164">analytics</text>
      @for (b of bars; track b.x) {
        <rect class="br-bar" [class.br-bar--alt]="$odd" [attr.x]="b.x" [attr.y]="252 - b.h" width="16" [attr.height]="b.h" rx="3" />
      }
      <line class="br-base" x1="370" y1="252.5" x2="572" y2="252.5" />

      <!-- flood map -->
      <rect class="dg-node" x="132" y="280" width="214" height="124" rx="12" />
      <g clip-path="url(#br-map)">
        @for (x of mapGrid; track x) {
          <line class="br-grid" [attr.x1]="x" y1="280" [attr.x2]="x" y2="404" />
        }
        <path class="br-zone" d="M132 330 C 180 310, 220 356, 262 336 S 320 306, 346 322 L346 404 L132 404 Z" />
        <path class="br-river" d="M132 360 C 175 334, 205 384, 245 356 S 305 326, 346 346" />
      </g>
      <text class="dg-sub" x="148" y="300">flood zone ae</text>
      <circle class="br-ripple" cx="268" cy="344" r="2" />
      <path class="br-pin" d="M268 344 C 268 344, 256 330, 256 322 A 12 12 0 1 1 280 322 C 280 330, 268 344, 268 344 Z" />
      <circle class="br-pin-dot" cx="268" cy="322" r="4" />

      <!-- documents -->
      <rect class="dg-node" x="356" y="280" width="228" height="124" rx="12" />
      <text class="dg-sub" x="372" y="300">documents</text>
      @for (d of docs; track d.name) {
        <g class="br-doc">
          <rect class="br-doc-icon" x="372" [attr.y]="d.y - 13" width="14" height="18" rx="3" />
          <text class="br-doc-name" x="394" [attr.y]="d.y">{{ d.name }}</text>
          <text class="br-doc-status" x="570" [attr.y]="d.y" text-anchor="end">{{ d.status }}</text>
        </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .br-nav {
      fill: rgb(var(--ink-rgb) / 0.12);
    }
    .br-nav--on {
      fill: var(--accent);
    }
    .br-role {
      fill: rgb(var(--signal-rgb) / 0.1);
      stroke: var(--signal);
    }
    .br-role-text {
      fill: var(--signal);
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .br-search {
      fill: #0a0a0b;
      stroke: var(--line-strong);
    }
    .br-search-icon {
      fill: none;
      stroke: var(--smoke);
      stroke-width: 1.4;
    }
    .br-typed {
      fill: var(--ink);
      text-transform: none;
      letter-spacing: 0.04em;
    }
    .br-step-track {
      stroke: rgb(var(--ink-rgb) / 0.1);
      stroke-width: 2;
    }
    .br-step-fill {
      stroke: var(--accent);
      stroke-width: 2;
    }
    .br-step circle {
      fill: #0e0e10;
      stroke: var(--line-strong);
      stroke-width: 1.5;
      transition:
        fill 0.35s,
        stroke 0.35s;
    }
    .br-step.is-done circle {
      fill: var(--accent);
      stroke: var(--accent);
    }
    .br-premium {
      fill: var(--ink);
      font-family: var(--ff-display);
      font-size: 36px;
    }
    .br-ok {
      fill: var(--signal);
      font-size: 10px;
      letter-spacing: 0.06em;
    }
    .br-bar {
      fill: rgb(var(--accent-rgb) / 0.75);
    }
    .br-bar--alt {
      fill: rgb(var(--ink-rgb) / 0.3);
    }
    .br-base {
      stroke: rgb(var(--ink-rgb) / 0.14);
    }
    .br-grid {
      stroke: rgb(var(--ink-rgb) / 0.05);
    }
    .br-zone {
      fill: rgb(var(--accent-rgb) / 0.09);
    }
    .br-river {
      fill: none;
      stroke: rgb(var(--signal-rgb) / 0.55);
      stroke-width: 5;
      stroke-linecap: round;
    }
    .br-ripple {
      fill: none;
      stroke: var(--accent);
      opacity: 0;
    }
    .br-pin {
      fill: var(--accent);
      filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.6));
    }
    .br-pin-dot {
      fill: var(--void);
    }
    .br-doc-icon {
      fill: rgb(var(--accent-rgb) / 0.2);
      stroke: var(--accent);
    }
    .br-doc-name {
      fill: var(--ink);
      font-size: 11px;
    }
    .br-doc-status {
      fill: var(--signal);
      font-size: 10px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrokerDiagram {
  protected readonly nav = NAV;
  protected readonly steps = STEPS;
  protected readonly bars = BARS;
  protected readonly docs = DOCS;
  protected readonly search = SEARCH;
  protected readonly premium = PREMIUM.toLocaleString('en-US', { minimumFractionDigits: 2 });
  protected readonly mapGrid = [152, 176, 200, 224, 248, 272, 296, 320];

  constructor() {
    mountDiagram((svg) => {
      const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
      const one = <T extends Element>(sel: string) => svg.querySelector<T>(sel)!;
      const typed = one<SVGTextElement>('.br-typed');
      const premium = one<SVGTextElement>('.br-premium');
      const steps = all<SVGGElement>('.br-step');
      const pin = [one('.br-pin'), one('.br-pin-dot')];
      const typing = { n: 0 };
      const amount = { v: 0 };

      const tl = gsap
        .timeline({ repeat: -1, repeatDelay: 1.2 })
        .add(() => steps.forEach((s) => s.classList.remove('is-done')))
        .set(all('.br-bar'), { scaleY: 0, transformOrigin: '50% 100%' })
        .set(one('.br-step-fill'), { scaleX: 0, transformOrigin: '0% 50%' })
        .set(pin, { y: -46, opacity: 0 })
        .set(all('.br-doc'), { opacity: 0, x: -10 })
        .set(one('.br-ok'), { opacity: 0 })
        .to(typing, {
          n: SEARCH.length,
          duration: 1,
          ease: 'none',
          onUpdate: () => {
            typed.textContent = SEARCH.slice(0, Math.ceil(typing.n));
          },
        })
        .addLabel('stepper')
        .to(one('.br-step-fill'), { scaleX: 1, duration: 1.6, ease: 'power1.inOut' }, 'stepper');

      steps.forEach((step, i) =>
        tl.add(() => step.classList.add('is-done'), `stepper+=${(i / (steps.length - 1)) * 1.55}`),
      );

      tl.fromTo(
        amount,
        { v: 0 },
        {
          v: PREMIUM,
          duration: 1.3,
          ease: 'power3.out',
          onUpdate: () => {
            premium.textContent = amount.v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          },
        },
        '-=0.3',
      )
        .to(one('.br-ok'), { opacity: 1, duration: 0.3 })
        .to(all('.br-bar'), { scaleY: 1, duration: 0.9, stagger: 0.07, ease: 'expo.out' }, '-=1')
        .to(pin, { y: 0, opacity: 1, duration: 0.9, ease: 'bounce.out' }, '-=0.6')
        .fromTo(one('.br-ripple'), { attr: { r: 2 }, opacity: 0.8 }, { attr: { r: 28 }, opacity: 0, duration: 1.2, ease: 'power2.out' }, '-=0.3')
        .to(all('.br-doc'), { opacity: 1, x: 0, duration: 0.5, stagger: 0.35, ease: 'power2.out' }, '-=0.8')
        .to({}, { duration: 1.8 });

      return gsap
        .timeline()
        .from(all('.dg-node'), { opacity: 0, y: 14, duration: 0.8, stagger: 0.06 })
        .add(tl, '-=0.3');
    });
  }
}
