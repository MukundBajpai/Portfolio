import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  isDevMode,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import { gsap, SplitText } from '../../core/gsap';
import { fontsReady, prefersReducedMotion, saveMotionChoice } from '../../core/motion';
import { ResumeService } from '../../core/resume';
import { SmoothScroll } from '../../core/smooth-scroll';
import { profile } from '../../data/portfolio';
import { Magnetic } from '../../shared/magnetic';

const VIEWS_SESSION_KEY = 'mb-viewed';
const VIEWS_CACHE_KEY = 'mb-views';
const formatViews = (n: number) => Math.round(n).toLocaleString('en-US');

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the counter still works, just without caching.
  }
}

@Component({
  selector: 'app-footer',
  imports: [Magnetic],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  // Unscoped so rules reach the characters SplitText creates at runtime (all classes are footer__-prefixed).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly profile = profile;
  protected readonly year = new Date().getFullYear();
  protected readonly time = signal('');
  protected readonly reducedMotion = prefersReducedMotion();
  protected readonly resume = inject(ResumeService);
  protected readonly views = {
    enabled: environment.views.enabled,
    display: signal(formatViews(environment.views.baseline)),
  };
  private readonly mark = viewChild.required<ElementRef<HTMLElement>>('mark');
  private readonly scroll = inject(SmoothScroll);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const clock = new Intl.DateTimeFormat('en-IN', {
      timeZone: profile.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const tick = () => this.time.set(clock.format(new Date()));
    tick();
    const timer = setInterval(tick, 15_000);
    destroyRef.onDestroy(() => clearInterval(timer));

    afterNextRender(() => {
      if (this.views.enabled) void this.loadViews();
    });

    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      let ctx: gsap.Context | undefined;
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        ctx?.revert();
      });
      void fontsReady().then(() => {
        if (destroyed) return;
        const el = this.mark().nativeElement;
        ctx = gsap.context(() => {
          const { chars } = SplitText.create(el, { type: 'chars', charsClass: 'footer__char' });
          gsap.from(chars, {
            yPercent: 100,
            duration: 1.5,
            stagger: { each: 0.05, from: 'center' },
            scrollTrigger: { trigger: el, start: 'top 95%', once: true },
          });
        }, el);
      });
    });
  }

  protected toTop(): void {
    this.scroll.scrollTo(0);
  }

  protected toggleMotion(): void {
    saveMotionChoice(this.reducedMotion ? 'full' : 'reduced');
  }

  private async loadViews(): Promise<void> {
    const { baseline, namespace, key } = environment.views;
    const counted = readStorage(sessionStorage, VIEWS_SESSION_KEY) === '1';
    const url = `https://abacus.jasoncameron.dev/${counted ? 'get' : 'hit'}/${namespace}/${isDevMode() ? `${key}-dev` : key}`;

    let visits = Number(readStorage(localStorage, VIEWS_CACHE_KEY)) || 0;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const body = res.ok ? ((await res.json()) as { value?: unknown }) : {};
      if (typeof body.value === 'number') {
        visits = body.value;
        writeStorage(localStorage, VIEWS_CACHE_KEY, String(visits));
        writeStorage(sessionStorage, VIEWS_SESSION_KEY, '1');
      }
    } catch {
      // Offline or API down: fall back to the last value this browser saw.
    }

    const total = baseline + visits;
    if (prefersReducedMotion()) {
      this.views.display.set(formatViews(total));
      return;
    }
    const counter = { v: baseline };
    gsap.to(counter, {
      v: total,
      duration: 2.4,
      delay: 1.5,
      ease: 'power3.out',
      onUpdate: () => this.views.display.set(formatViews(counter.v)),
    });
  }
}
