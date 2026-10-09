import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { gsap, SplitText } from '../../core/gsap';
import { Intro } from '../../core/intro';
import { fontsReady, isFinePointer, prefersReducedMotion } from '../../core/motion';
import { ResumeService } from '../../core/resume';
import { SmoothScroll } from '../../core/smooth-scroll';
import { agentTrace, heroLede, heroRoles, profile } from '../../data/portfolio';
import { Arrow } from '../../shared/arrow';
import { Magnetic } from '../../shared/magnetic';
import { Tilt } from '../../shared/tilt';

@Component({
  selector: 'app-hero',
  imports: [Arrow, Magnetic, Tilt],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  // Unscoped so rules reach SplitText's runtime characters (all classes are hero__/trace__-prefixed).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  protected readonly profile = profile;
  protected readonly resume = inject(ResumeService);
  protected readonly roles = heroRoles;
  protected readonly lede = heroLede;
  protected readonly trace = agentTrace;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly intro = inject(Intro);
  private readonly scroll = inject(SmoothScroll);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const root = this.host.nativeElement;
      let ctx: gsap.Context | undefined;
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        ctx?.revert();
      });
      void fontsReady().then(() => {
        if (destroyed) return;
        ctx = gsap.context(() => this.animate(root), root);
      });
    });
  }

  protected go(event: Event, id: string): void {
    event.preventDefault();
    this.scroll.scrollTo(`#${id}`);
  }

  private animate(root: HTMLElement): () => void {
    const stopSpotlight = this.spotlight(root);
    if (prefersReducedMotion()) return stopSpotlight;

    const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    const split = (sel: string) => SplitText.create(q(sel), { type: 'chars', charsClass: 'hero__char' }).chars;
    const solid = split('.hero__word--solid');
    const outline = split('.hero__word--outline');
    const fill = split('.hero__word--fill');

    // Give every fill letter its offset into one gradient spanning the whole word.
    const fillWord = q('.hero__word--fill');
    const layoutFill = () => {
      fillWord.style.setProperty('--word-w', `${fillWord.offsetWidth}px`);
      for (const c of fill as HTMLElement[]) c.style.setProperty('--char-x', `${-c.offsetLeft}px`);
    };
    fillWord.classList.add('is-split');
    layoutFill();
    window.addEventListener('resize', layoutFill);

    const rise = { yPercent: 118, rotate: 7 };
    const settle = { yPercent: 0, rotate: 0, duration: 1.7, stagger: 0.055, ease: 'expo.out' };

    const typing = this.traceLoop(root);
    const rotating = this.roleLoop(q('.hero__role-word'));

    const intro = gsap
      .timeline({ paused: true })
      .fromTo(solid, rise, settle, 0)
      .fromTo(outline, rise, settle, 0.2)
      .fromTo(fill, rise, settle, 0.2)
      .from(root.querySelectorAll('[data-hero-fade]'), { y: 34, opacity: 0, duration: 1.4, stagger: 0.09 }, 0.45)
      .from(q('.hero__trace'), { y: 60, opacity: 0, duration: 1.6 }, 0.75)
      .from(q('.hero__badge'), { scale: 0.4, opacity: 0, rotate: -90, duration: 1.6 }, 0.9)
      .add(() => typing.play(), 1.9)
      .add(() => rotating.play(), 2.4);
    void this.intro.finished.then(() => intro.play());

    // Cinematic exit: the name splits apart and the copy lifts away as you scroll.
    gsap
      .timeline({ scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } })
      .to(q('.hero__line--1'), { xPercent: -12, ease: 'none' }, 0)
      .to(q('.hero__line--2'), { xPercent: 9, ease: 'none' }, 0)
      .to(q('.hero__bottom'), { y: -70, opacity: 0, ease: 'none' }, 0)
      .to(q('.hero__trace-wrap'), { yPercent: -35, opacity: 0, ease: 'none' }, 0);

    return () => {
      stopSpotlight();
      window.removeEventListener('resize', layoutFill);
    };
  }

  /** Surname is outlined; a gradient fill follows the cursor through a radial mask. */
  private spotlight(root: HTMLElement): () => void {
    const stack = root.querySelector<HTMLElement>('.hero__stack')!;
    if (!isFinePointer()) {
      stack.classList.add('is-auto');
      return () => {};
    }
    const pos = { x: 0, y: 0 };
    const paint = () => {
      stack.style.setProperty('--mx', `${pos.x}px`);
      stack.style.setProperty('--my', `${pos.y}px`);
    };
    const xTo = gsap.quickTo(pos, 'x', { duration: 0.7, ease: 'power3.out', onUpdate: paint });
    const yTo = gsap.quickTo(pos, 'y', { duration: 0.7, ease: 'power3.out', onUpdate: paint });
    const move = (e: PointerEvent) => {
      const r = stack.getBoundingClientRect();
      xTo(e.clientX - r.left);
      yTo(e.clientY - r.top);
      stack.classList.add('is-lit');
    };
    const leave = () => stack.classList.remove('is-lit');
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
    };
  }

  private roleLoop(el: HTMLElement): gsap.core.Timeline {
    const tl = gsap.timeline({ repeat: -1, paused: true });
    this.roles.forEach((_, i) => {
      tl.to(
        el,
        {
          duration: 1.1,
          ease: 'none',
          scrambleText: { text: this.roles[(i + 1) % this.roles.length], chars: 'lowerCase', speed: 0.5, revealDelay: 0.3 },
        },
        '+=2.2',
      );
    });
    return tl;
  }

  /** Types the sample agent trace line by line, then loops. */
  private traceLoop(root: HTMLElement): gsap.core.Timeline {
    const rows = Array.from(root.querySelectorAll<HTMLElement>('.trace__row'));
    gsap.set(rows, { opacity: 0 });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, paused: true }).set(rows, { opacity: 0 });
    for (const row of rows) {
      const msg = row.querySelector<HTMLElement>('.trace__msg')!;
      const ok = row.querySelector<HTMLElement>('.trace__ok');
      const text = msg.dataset['text'] ?? '';
      const typed = { n: 0 };
      tl.set(row, { opacity: 1 }, '+=0.3').to(typed, {
        n: text.length,
        duration: Math.max(0.3, text.length * 0.028),
        ease: 'none',
        onUpdate: () => {
          msg.textContent = text.slice(0, Math.ceil(typed.n));
        },
      });
      if (ok) tl.fromTo(ok, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, '+=0.05');
    }
    return tl.to(rows, { opacity: 0, duration: 0.5, stagger: 0.05 }, '+=2.8');
  }
}
