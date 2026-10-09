import { ChangeDetectionStrategy, Component } from '@angular/core';
import { gsap } from '../../../core/gsap';
import { along, mountDiagram } from '../../../shared/diagram';

const EDGES = [
  'M152 200 L254 200', // devops → orchestrator
  'M338 176 C 392 146, 402 78, 444 78', // → triage
  'M346 200 L444 200', // → assign
  'M338 224 C 392 254, 402 322, 444 322', // → update
  'M300 246 L300 330', // orchestrator ↔ rag
  'M232 356 L152 356', // rag ↔ cosmos
];

const AGENTS = [
  { label: 'Triage agent', sub: 'priority · team', y: 78 },
  { label: 'Assign agent', sub: 'owner · queue', y: 200 },
  { label: 'Update agent', sub: 'status · notes', y: 322 },
];

@Component({
  selector: 'app-agents-diagram',
  template: `
    <svg
      class="dg"
      viewBox="0 0 600 420"
      role="img"
      aria-label="An orchestrator routes Azure DevOps tickets to triage, assignment and update agents, grounded by RAG over MCP on Cosmos DB"
    >
      <defs>
        <pattern id="ag-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle class="dg-grid" cx="1.5" cy="1.5" r="1" />
        </pattern>
        <radialGradient id="ag-glow">
          <stop offset="0" style="stop-color: var(--accent)" stop-opacity="0.42" />
          <stop offset="1" style="stop-color: var(--accent)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="420" fill="url(#ag-dots)" />

      @for (d of edges; track $index) {
        <path class="dg-edge" [attr.d]="d" />
        <path class="dg-flow" [attr.d]="d" />
      }

      <g class="dg-n" data-node="src">
        <rect class="dg-node" x="20" y="170" width="132" height="60" rx="12" />
        <circle class="dg-dot" cx="138" cy="184" r="3.5" />
        <text class="dg-label" x="34" y="197">Azure DevOps</text>
        <text class="dg-sub" x="34" y="214">ticket #4821</text>
      </g>

      <circle cx="300" cy="200" r="98" fill="url(#ag-glow)" />
      <circle class="ag-pulse" cx="300" cy="200" r="46" />
      <circle class="ag-ring dg-spin" cx="300" cy="200" r="60" />
      <g class="dg-n" data-node="orch">
        <circle class="dg-node" cx="300" cy="200" r="46" />
        <text class="dg-label" x="300" y="198" text-anchor="middle">Orchestrator</text>
        <text class="dg-sub" x="300" y="214" text-anchor="middle">router</text>
      </g>

      @for (a of agents; track a.label) {
        <g class="dg-n" data-node="agent">
          <rect class="dg-node" x="444" [attr.y]="a.y - 26" width="136" height="52" rx="12" />
          <circle class="dg-dot" cx="566" [attr.cy]="a.y - 12" r="3.5" />
          <text class="dg-label" x="458" [attr.y]="a.y - 1">{{ a.label }}</text>
          <text class="dg-sub" x="458" [attr.y]="a.y + 15">{{ a.sub }}</text>
        </g>
      }

      <g class="dg-n" data-node="rag">
        <rect class="dg-node" x="232" y="330" width="136" height="52" rx="12" />
        <circle class="dg-dot" cx="354" cy="344" r="3.5" />
        <text class="dg-label" x="246" y="354">RAG · MCP</text>
        <text class="dg-sub" x="246" y="370">embeddings</text>
      </g>

      <g class="dg-n" data-node="db">
        <rect class="dg-node" x="20" y="330" width="132" height="52" rx="12" />
        <circle class="dg-dot" cx="138" cy="344" r="3.5" />
        <text class="dg-label" x="34" y="354">Cosmos DB</text>
        <text class="dg-sub" x="34" y="370">known errors</text>
      </g>

      <circle class="dg-packet ag-packet" r="4.5" />
      <circle class="dg-packet dg-packet--cool ag-packet" r="4.5" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .ag-pulse {
      fill: none;
      stroke: var(--accent);
      stroke-width: 1.5;
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
    }
    .ag-ring {
      fill: none;
      stroke: rgb(var(--accent-rgb) / 0.45);
      stroke-dasharray: 3 7;
    }
    .ag-packet {
      opacity: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentsDiagram {
  protected readonly edges = EDGES;
  protected readonly agents = AGENTS;

  constructor() {
    mountDiagram((svg) => {
      const q = <T extends Element>(sel: string) => svg.querySelector<T>(sel)!;
      const [e0, e1, e2, e3, e4, e5] = Array.from(svg.querySelectorAll<SVGPathElement>('.dg-edge'));
      const src = q<SVGGElement>('[data-node="src"]');
      const orch = q<SVGGElement>('[data-node="orch"]');
      const rag = q<SVGGElement>('[data-node="rag"]');
      const db = q<SVGGElement>('[data-node="db"]');
      const agents = Array.from(svg.querySelectorAll<SVGGElement>('[data-node="agent"]'));
      const [packet, context] = Array.from(svg.querySelectorAll<SVGCircleElement>('.ag-packet'));
      const pulse = q<SVGCircleElement>('.ag-pulse');

      const master = gsap
        .timeline()
        .from(svg.querySelectorAll('.dg-edge'), { drawSVG: '0%', duration: 1.2, stagger: 0.1, ease: 'power2.inOut' })
        .from(svg.querySelectorAll('.dg-flow'), { opacity: 0, duration: 0.6 }, '-=0.4')
        .from(
          svg.querySelectorAll('.dg-n'),
          { opacity: 0, scale: 0.85, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.06, ease: 'back.out(1.6)' },
          0.2,
        );

      const loop = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
      agents.forEach((agent, k) => {
        loop
          .add(() => src.classList.add('is-on'))
          .set(packet, { opacity: 1 })
          .to(packet, along(e0, 0.7))
          .add(() => {
            src.classList.remove('is-on');
            orch.classList.add('is-on');
          })
          .fromTo(pulse, { scale: 1, opacity: 0.9 }, { scale: 1.7, opacity: 0, duration: 0.8, ease: 'power2.out' }, '<')
          .to(packet, along(e4, 0.45))
          .add(() => rag.classList.add('is-on'))
          .to(packet, along(e5, 0.4))
          .add(() => db.classList.add('is-on'))
          .set(packet, { opacity: 0 })
          .set(context, { opacity: 1 })
          .to(context, along(e5, 0.4, true))
          .to(context, along(e4, 0.45, true))
          .add(() => {
            rag.classList.remove('is-on');
            db.classList.remove('is-on');
          })
          .set(context, { opacity: 0 })
          .set(packet, { opacity: 1 })
          .to(packet, along([e1, e2, e3][k], 0.7))
          .add(() => {
            orch.classList.remove('is-on');
            agent.classList.add('is-on');
          })
          .set(packet, { opacity: 0 })
          .add(() => {
            agent.classList.remove('is-on');
            agent.classList.add('is-done');
          }, '+=0.35');
      });
      loop.add(() => agents.forEach((a) => a.classList.remove('is-done')), '+=1.2');

      return master.add(loop);
    });
  }
}
