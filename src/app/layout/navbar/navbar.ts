import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ScrollTrigger } from '../../core/gsap';
import { SmoothScroll } from '../../core/smooth-scroll';
import { ThemeState } from '../../core/theme-state';
import { navLinks, profile } from '../../data/portfolio';
import { Arrow } from '../../shared/arrow';
import { Magnetic } from '../../shared/magnetic';
import { Scramble } from '../../shared/scramble';

@Component({
  selector: 'app-navbar',
  imports: [Arrow, Magnetic, Scramble],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeMenu()' },
})
export class Navbar {
  protected readonly links = navLinks;
  protected readonly profile = profile;
  protected readonly active = signal('');
  protected readonly hidden = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  private readonly themeState = inject(ThemeState);
  protected readonly isLight = computed(() => this.themeState.theme() === 'light');

  private readonly scroll = inject(SmoothScroll);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly progress = viewChild.required<ElementRef<HTMLElement>>('progress');
  private readonly indicator = viewChild.required<ElementRef<HTMLElement>>('indicator');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const bar = this.progress().nativeElement;
      const offScroll = this.scroll.onScroll(({ scroll, direction, progress }) => {
        this.scrolled.set(scroll > 40);
        this.hidden.set(scroll > 280 && direction === 1 && !this.menuOpen());
        bar.style.transform = `scaleX(${progress})`;
      });

      const triggers = this.links.flatMap(({ id }) => {
        const section = document.getElementById(id);
        if (!section) return [];
        return ScrollTrigger.create({
          trigger: section,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => {
            if (self.isActive) this.setActive(id);
            else if (this.active() === id) this.setActive('');
          },
        });
      });

      const onResize = () => this.setActive(this.active());
      window.addEventListener('resize', onResize);

      destroyRef.onDestroy(() => {
        offScroll();
        triggers.forEach((t) => t.kill());
        window.removeEventListener('resize', onResize);
      });
    });
  }

  protected go(event: Event, id: string): void {
    event.preventDefault();
    this.closeMenu();
    this.scroll.scrollTo(id === 'top' ? 0 : `#${id}`);
  }

  protected toggleTheme(event: MouseEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.themeState.toggle(box.left + box.width / 2, box.top + box.height / 2);
  }

  protected toggleMenu(): void {
    const open = !this.menuOpen();
    this.menuOpen.set(open);
    if (open) this.scroll.stop();
    else this.scroll.start();
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.scroll.start();
  }

  private setActive(id: string): void {
    this.active.set(id);
    const indicator = this.indicator().nativeElement;
    const link = id ? this.host.nativeElement.querySelector<HTMLElement>(`.nav__link[data-link="${id}"]`) : null;
    if (!link) {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  }
}
