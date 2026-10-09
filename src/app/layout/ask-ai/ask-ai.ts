import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import { isFinePointer } from '../../core/motion';
import { ResumeService } from '../../core/resume';
import { SmoothScroll } from '../../core/smooth-scroll';
import { buildChunks, FALLBACK, Reply, ReplyLink, retrieve, SUGGESTIONS } from '../../data/knowledge';
import * as data from '../../data/portfolio';
import { Mascot } from './mascot';

type Message = { id: number; role: 'user'; text: string } | { id: number; role: 'assistant'; reply: Reply };

const HINT_KEY = 'mb-ask-hint';
const MIN_THINK_MS = 650;
const NARROW = '(max-width: 639px)';

/** "- " / "• " lines become points; everything else is the lead. */
function parse(text: string): Reply {
  const lines = text.replace(/\*\*/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const points = lines.filter((l) => /^[-•*]\s/.test(l)).map((l) => l.replace(/^[-•*]\s+/, ''));
  const lead = lines.filter((l) => !/^[-•*]\s/.test(l)).join('\n\n');
  return { lead: lead || points.shift() || '', points };
}

/** Floating "Ask my AI". Answers from the portfolio data in the browser, or via Claude when the function is configured. */
@Component({
  selector: 'app-ask-ai',
  imports: [Mascot],
  templateUrl: './ask-ai.html',
  styleUrl: './ask-ai.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:pointermove)': 'look($event)',
  },
})
export class AskAi {
  protected readonly enabled = environment.askAi;
  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  protected readonly messages = signal<Message[]>([]);
  protected readonly hint = signal(false);
  protected readonly lifted = signal(false);
  protected readonly hovered = signal(false);
  protected readonly suggestions = SUGGESTIONS;
  protected readonly resume = inject(ResumeService);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly scroll = inject(SmoothScroll);
  private readonly chunks = buildChunks(data);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('field');
  private remote: boolean | null = null;
  private nextId = 0;
  private lookFrame = 0;
  private scrollLocked = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.enabled) return;
      const timers: ReturnType<typeof setTimeout>[] = [];
      let offScroll = () => {};
      // Say hi once per visit, after the hero, so the bubble never sits on the hero's buttons.
      if (!sessionStorage.getItem(HINT_KEY)) {
        offScroll = this.scroll.onScroll(({ scroll }) => {
          if (scroll < innerHeight * 0.9) return;
          offScroll();
          sessionStorage.setItem(HINT_KEY, '1');
          timers.push(
            setTimeout(() => {
              if (this.open()) return;
              this.hint.set(true);
              timers.push(setTimeout(() => this.hint.set(false), 7000));
            }, 1200),
          );
        });
      }
      // Rise above the footer's last line (admin lock, credits) instead of covering it.
      const credit = document.querySelector('.footer__credit');
      const observer = new IntersectionObserver(([e]) => this.lifted.set(e.isIntersecting));
      if (credit) observer.observe(credit);
      destroyRef.onDestroy(() => {
        offScroll();
        timers.forEach(clearTimeout);
        observer.disconnect();
        cancelAnimationFrame(this.lookFrame);
        this.unlockScroll();
      });
    });
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  protected show(): void {
    this.hint.set(false);
    this.open.set(true);
    if (matchMedia(NARROW).matches) {
      this.scroll.stop();
      this.scrollLocked = true;
    }
    setTimeout(() => this.input()?.nativeElement.focus({ preventScroll: true }), 350);
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.unlockScroll();
  }

  protected reset(): void {
    this.messages.set([]);
    this.busy.set(false);
    this.input()?.nativeElement.focus({ preventScroll: true });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const field = this.input()?.nativeElement;
    if (!field) return;
    const text = field.value.trim();
    field.value = '';
    if (text) void this.ask(text);
  }

  protected async ask(text: string): Promise<void> {
    if (this.busy()) return;
    this.push({ id: this.nextId++, role: 'user', text: text.slice(0, 300) });
    this.busy.set(true);
    const [remote] = await Promise.all([this.fromClaude(), new Promise((r) => setTimeout(r, MIN_THINK_MS))]);
    const reply = remote ?? retrieve(this.chunks, text)[0]?.reply ?? FALLBACK;
    this.busy.set(false);
    this.push({ id: this.nextId++, role: 'assistant', reply });
  }

  protected href(link: ReplyLink): string {
    return link.href === 'resume' ? this.resume.href() : link.href;
  }

  protected external(link: ReplyLink): boolean {
    return /^https?:/.test(link.href);
  }

  protected follow(event: MouseEvent, link: ReplyLink): void {
    if (!link.href.startsWith('#')) return;
    event.preventDefault();
    if (matchMedia(NARROW).matches) this.close();
    this.scroll.scrollTo(link.href);
  }

  /** Eyes follow the cursor (fine pointers only). */
  protected look(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.lookFrame || !isFinePointer()) return;
    this.lookFrame = requestAnimationFrame(() => {
      this.lookFrame = 0;
      const box = this.host.querySelector('.ask__fab')?.getBoundingClientRect();
      if (!box) return;
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      this.host.style.setProperty('--lx', clamp(dx / 300).toFixed(2));
      this.host.style.setProperty('--ly', clamp(dy / 300).toFixed(2));
    });
  }

  private push(message: Message): void {
    this.messages.update((m) => [...m, message]);
    setTimeout(() => {
      const el = this.log()?.nativeElement;
      el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 40);
  }

  private unlockScroll(): void {
    if (!this.scrollLocked) return;
    this.scrollLocked = false;
    this.scroll.start();
  }

  private async fromClaude(): Promise<Reply | null> {
    if (this.remote === false) return null;
    const turns = this.messages()
      .slice(-9)
      .map((m) => ({ role: m.role, content: m.role === 'user' ? m.text : m.reply.lead }));
    while (turns.length && turns[0].role !== 'user') turns.shift();
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: turns }),
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const { reply } = (await res.json()) as { reply?: string };
        if (reply) {
          this.remote = true;
          return parse(reply);
        }
      }
      // Not configured (503) or no backend at all: answer locally from now on.
      if (res.status === 503 || !isJson) this.remote = false;
    } catch {
      // Offline: answer locally this time.
    }
    return null;
  }
}
