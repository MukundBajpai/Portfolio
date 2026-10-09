import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let uid = 0;

/**
 * The chat's sidekick (same little robot as the 3D figure's accessory). It blinks and floats; its eyes
 * follow `--lx` / `--ly` (-1..1) from an ancestor; `mood` switches to a smile or a thinking scan.
 */
@Component({
  selector: 'app-mascot',
  template: `
    <svg viewBox="0 0 64 64" aria-hidden="true" [class]="'m m--' + mood()">
      <defs>
        <radialGradient [attr.id]="gid" cx="34%" cy="26%" r="78%">
          <stop offset="0" style="stop-color: var(--accent-soft)" />
          <stop offset="0.5" style="stop-color: var(--accent)" />
          <stop offset="1" style="stop-color: var(--accent-deep)" />
        </radialGradient>
      </defs>
      <g class="m__float">
        <line class="m__antenna" x1="32" y1="10" x2="32" y2="4.5" />
        <circle class="m__bulb" cx="32" cy="4" r="2.8" />
        <circle cx="32" cy="35" r="25" [attr.fill]="'url(#' + gid + ')'" />
        <ellipse class="m__shine" cx="22" cy="20.5" rx="8" ry="4.6" transform="rotate(-28 22 20.5)" />
        <rect class="m__visor" x="13.5" y="25" width="37" height="21" rx="10.5" />
        <g class="m__look">
          <rect class="m__eye" x="21" y="30.5" width="6.5" height="10" rx="3.25" />
          <rect class="m__eye" x="36.5" y="30.5" width="6.5" height="10" rx="3.25" />
        </g>
        <path class="m__smile" d="M27.5 50.5q4.5 3.2 9 0" />
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
    }
    .m {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .m__float {
      animation: m-float 3.6s ease-in-out infinite;
    }
    .m__antenna {
      stroke: var(--accent-deep);
      stroke-width: 2.4;
      stroke-linecap: round;
    }
    .m__bulb {
      fill: var(--signal);
      animation: m-bulb 2.4s ease-in-out infinite;
    }
    .m__shine {
      fill: #fff;
      opacity: 0.38;
    }
    .m__visor {
      fill: #140f0b;
    }
    .m__look {
      transform: translate(calc(var(--lx, 0) * 3px), calc(var(--ly, 0) * 2px));
      transition: transform 0.25s ease-out;
    }
    .m__eye {
      fill: var(--signal);
      transform-box: fill-box;
      transform-origin: center;
      animation: m-blink 4.4s infinite;
      transition:
        transform 0.3s ease,
        height 0.3s ease;
    }
    .m__smile {
      fill: none;
      stroke: #140f0b;
      stroke-width: 2.4;
      stroke-linecap: round;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .m--happy .m__eye {
      animation: none;
      transform: scaleY(0.4) translateY(-1px);
    }
    .m--happy .m__smile {
      opacity: 0.9;
    }
    .m--thinking .m__look {
      animation: m-scan 1.1s ease-in-out infinite alternate;
    }
    .m--thinking .m__eye {
      animation: none;
      transform: scaleY(0.55);
    }
    .m--thinking .m__bulb {
      animation-duration: 0.6s;
    }

    @keyframes m-float {
      50% {
        transform: translateY(-2px);
      }
    }
    @keyframes m-blink {
      0%,
      90%,
      100% {
        transform: scaleY(1);
      }
      93% {
        transform: scaleY(0.1);
      }
    }
    @keyframes m-bulb {
      50% {
        opacity: 0.35;
      }
    }
    @keyframes m-scan {
      from {
        transform: translateX(-3px);
      }
      to {
        transform: translateX(3px);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Mascot {
  readonly mood = input<'idle' | 'happy' | 'thinking'>('idle');
  protected readonly gid = `mascot-body-${++uid}`;
}
