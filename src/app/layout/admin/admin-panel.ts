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
import { NgTemplateOutlet } from '@angular/common';
import { MAX_RESUME_BYTES, ResumeMeta, ResumeService, StudioTab } from '../../core/resume';
import { SmoothScroll } from '../../core/smooth-scroll';
import { originals } from '../../data/content';
import { cleanContent, diffContent, Editable, mergeContent, SiteContent, SKILL_IDS } from '../../data/content-schema';
import type { Link } from '../../data/portfolio';
import { skillGroups } from '../../data/portfolio';
import { Arrow } from '../../shared/arrow';
import { LISTS, ListSection, TAB_SECTIONS, TABS } from './studio-fields';

interface ApiBody {
  resume?: ResumeMeta | null;
  content?: SiteContent | null;
  error?: string;
  errors?: string[];
  attemptsLeft?: number;
  retryAfter?: number;
}

type Path = (string | number)[];

const NO_API =
  "The admin API isn't running here. It lives in Netlify Functions, so deploy with Git or the Netlify CLI (drag-and-drop uploads static files only).";

function explain(status: number, body: ApiBody | null): string {
  if (!body) return NO_API;
  switch (body.error) {
    case 'unauthorized':
      return body.attemptsLeft
        ? `Wrong password. ${body.attemptsLeft} attempt${body.attemptsLeft === 1 ? '' : 's'} left.`
        : 'Wrong password. Admin is locked for 15 minutes.';
    case 'locked':
      return `Too many attempts. Try again in ${Math.ceil((body.retryAfter ?? 900) / 60)} min.`;
    case 'too-large':
      return 'That is too large to upload.';
    case 'not-pdf':
      return "That file isn't a PDF.";
    case 'invalid':
      return body.errors?.join(' ') ?? 'Some fields need attention.';
    default:
      return `Something went wrong (${status}). Please try again.`;
  }
}

const clone = <T>(v: T): T => structuredClone(v);
const isList = (tab: StudioTab): tab is ListSection => tab === 'projects' || tab === 'journey' || tab === 'highlights';

/**
 * Owner-only studio: résumé upload plus editing of projects, experience, highlights, skills and profile.
 * Changes are published to Netlify Blobs and appear for every visitor without a redeploy. The password is
 * verified by the Netlify Function on every request; it lives only in memory while this panel is open.
 */
@Component({
  selector: 'app-admin-panel',
  imports: [Arrow, NgTemplateOutlet],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class AdminPanel {
  protected readonly resume = inject(ResumeService);
  protected readonly unlocked = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly dragging = signal(false);
  protected readonly confirmRestore = signal(false);

  // ─── Studio state ───
  protected readonly tabs = TABS;
  protected readonly lists = LISTS;
  protected readonly skillIds = SKILL_IDS;
  protected readonly skillTitles = Object.fromEntries(skillGroups.map((g) => [g.id, g.title]));
  protected readonly tab = signal<StudioTab>(this.resume.panelTab());
  protected readonly base = signal<Editable>(mergeContent(originals, null));
  protected readonly draft = signal<Editable>(mergeContent(originals, null));
  protected readonly selected = signal(0);
  protected readonly editing = signal(false);
  protected readonly confirmDelete = signal<number | null>(null);
  protected readonly confirmClose = signal(false);
  protected readonly issues = signal<string[]>([]);
  protected readonly published = signal(false);

  protected readonly dirtyTabs = computed(() => {
    const b = this.base();
    const d = this.draft();
    const changed = (k: keyof Editable) => JSON.stringify(b[k]) !== JSON.stringify(d[k]);
    return new Set(TABS.filter((t) => (TAB_SECTIONS[t.id] as readonly (keyof Editable)[]).some(changed)).map((t) => t.id));
  });
  protected readonly dirty = computed(() => this.dirtyTabs().size > 0);
  protected readonly tabLabel = computed(() => TABS.find((t) => t.id === this.tab())?.label ?? '');
  protected readonly pad = (n: number) => String(n).padStart(2, '0');
  protected readonly listTab = computed(() => (isList(this.tab()) ? (this.tab() as ListSection) : null));
  protected readonly items = computed(() => {
    const t = this.listTab();
    return t ? (this.draft()[t] as unknown as Record<string, unknown>[]) : [];
  });

  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('password');
  private readonly scroll = inject(SmoothScroll);
  /** Held in memory only while the panel is open; closing the panel forgets it. */
  private password = '';

  constructor() {
    this.scroll.stop();
    inject(DestroyRef).onDestroy(() => this.scroll.start());
    afterNextRender(() => this.passwordInput()?.nativeElement.focus());
  }

  protected close(): void {
    if (this.dirty() && !this.confirmClose()) {
      this.confirmClose.set(true);
      this.notice.set('');
      this.error.set('You have unpublished changes. Publish them, or close again to discard.');
      return;
    }
    this.resume.closePanel();
  }

  protected async login(event: Event): Promise<void> {
    event.preventDefault();
    const password = this.passwordInput()?.nativeElement.value ?? '';
    if (!password || this.busy()) return;
    const body = await this.call('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!body) return;
    this.password = password;
    this.resume.current.set(body.resume ?? null);
    const live = mergeContent(originals, body.content);
    this.base.set(live);
    this.draft.set(clone(live));
    this.unlocked.set(true);
  }

  protected lock(): void {
    this.password = '';
    this.unlocked.set(false);
    this.error.set('');
    this.notice.set('');
    queueMicrotask(() => this.passwordInput()?.nativeElement.focus());
  }

  protected go(tab: StudioTab): void {
    this.tab.set(tab);
    this.selected.set(0);
    this.editing.set(false);
    this.confirmDelete.set(null);
    this.issues.set([]);
  }

  // ─── Generic editing (paths into the draft) ───

  protected at(path: Path): unknown {
    return path.reduce<unknown>((o, k) => (o as Record<string | number, unknown> | undefined)?.[k], this.draft());
  }

  protected put(path: Path, value: unknown): void {
    this.draft.update((d) => {
      const next = clone(d);
      let o = next as unknown as Record<string | number, unknown>;
      for (const k of path.slice(0, -1)) o = o[k] as Record<string | number, unknown>;
      const last = path[path.length - 1];
      if (value === undefined || value === '') delete o[last];
      else o[last] = value;
      return next;
    });
    this.published.set(false);
    this.confirmClose.set(false);
  }

  protected text(path: Path): string {
    const v = this.at(path);
    return typeof v === 'string' || typeof v === 'number' ? String(v) : '';
  }

  protected lines(path: Path): string {
    const v = this.at(path);
    return Array.isArray(v) ? v.join('\n') : '';
  }

  protected setLines(path: Path, value: string): void {
    this.put(path, value.split('\n'));
  }

  protected chips(path: Path): string[] {
    const v = this.at(path);
    return Array.isArray(v) ? (v as string[]) : [];
  }

  protected chipKey(event: KeyboardEvent, path: Path): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addChips(path, input);
    } else if (event.key === 'Backspace' && !input.value) {
      const list = this.chips(path);
      if (list.length) this.put(path, list.slice(0, -1));
    }
  }

  protected addChips(path: Path, input: HTMLInputElement): void {
    const list = this.chips(path);
    const fresh = input.value
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && !list.some((y) => y.toLowerCase() === x.toLowerCase()));
    input.value = '';
    if (fresh.length) this.put(path, [...list, ...fresh]);
  }

  protected removeChip(path: Path, index: number): void {
    this.put(
      path,
      this.chips(path).filter((_, i) => i !== index),
    );
  }

  protected link(path: Path): Link {
    return (this.at(path) as Link | undefined) ?? { label: '', href: '' };
  }

  protected setLink(path: Path, part: keyof Link, value: string): void {
    const next = { ...this.link(path), [part]: value };
    this.put(path, next.label || next.href ? next : undefined);
  }

  protected rows(path: Path): Link[] {
    const v = this.at(path);
    return Array.isArray(v) ? (v as Link[]) : [];
  }

  protected addRow(path: Path): void {
    this.put(path, [...this.rows(path), { label: '', href: 'https://' }]);
  }

  protected setRow(path: Path, index: number, part: keyof Link, value: string): void {
    this.put(
      path,
      this.rows(path).map((r, i) => (i === index ? { ...r, [part]: value } : r)),
    );
  }

  protected removeRow(path: Path, index: number): void {
    this.put(
      path,
      this.rows(path).filter((_, i) => i !== index),
    );
  }

  protected field(section: ListSection, key: string): Path {
    return [section, this.selected(), key];
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  // ─── List operations ───

  protected open(index: number): void {
    this.selected.set(index);
    this.editing.set(true);
    this.confirmDelete.set(null);
  }

  protected add(): void {
    const section = this.listTab();
    if (!section) return;
    const list = this.items();
    // Newest first for experience (it's a timeline), last for the others.
    const atTop = section === 'journey';
    const next = atTop ? [LISTS[section].blank(), ...list] : [...list, LISTS[section].blank()];
    this.put([section], next);
    this.open(atTop ? 0 : next.length - 1);
  }

  protected move(index: number, by: -1 | 1): void {
    const section = this.listTab();
    const to = index + by;
    const list = [...this.items()];
    if (!section || to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
    this.put([section], list);
    if (this.selected() === index) this.selected.set(to);
  }

  protected remove(index: number): void {
    const section = this.listTab();
    if (!section) return;
    if (this.confirmDelete() !== index) {
      this.confirmDelete.set(index);
      return;
    }
    this.confirmDelete.set(null);
    this.put(
      [section],
      this.items().filter((_, i) => i !== index),
    );
    this.selected.set(Math.max(0, Math.min(this.selected(), this.items().length - 1)));
    this.editing.set(false);
  }

  // ─── Profile helpers ───

  protected stats(): Editable['stats'] {
    return this.draft().stats;
  }

  protected setStat(index: number, key: string, value: string): void {
    const numeric = key === 'value' || key === 'decimals';
    this.put(['stats', index, key], numeric ? (value === '' ? '' : Number(value)) : value);
  }

  // ─── Publish ───

  protected resetTab(): void {
    for (const key of TAB_SECTIONS[this.tab()] as readonly (keyof Editable)[]) this.put([key], clone(originals[key]));
    this.selected.set(0);
    this.editing.set(false);
  }

  protected discard(): void {
    this.draft.set(clone(this.base()));
    this.issues.set([]);
    this.confirmClose.set(false);
    this.error.set('');
  }

  protected async publish(): Promise<void> {
    if (this.busy()) return;
    const { content, errors } = cleanContent(diffContent(originals, this.draft()));
    this.issues.set(errors);
    if (errors.length) return;
    const body = await this.call('/api/admin/content', {
      method: 'PUT',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });
    if (!body) return;
    const live = mergeContent(originals, body.content);
    this.base.set(live);
    this.draft.set(clone(live));
    this.published.set(true);
    this.confirmClose.set(false);
    this.notice.set('Published. It’s live for every visitor.');
  }

  protected reload(): void {
    location.reload();
  }

  // ─── Résumé ───

  protected pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.upload(file);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.upload(file);
  }

  protected dragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected async restore(): Promise<void> {
    if (!this.confirmRestore()) {
      this.confirmRestore.set(true);
      this.notice.set('');
      this.error.set('');
      return;
    }
    this.confirmRestore.set(false);
    const body = await this.call('/api/admin/resume', { method: 'DELETE', headers: this.authHeaders() });
    if (!body) return;
    this.resume.current.set(null);
    this.notice.set('Restored: visitors get the original résumé again.');
  }

  protected size(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected date(iso: string): string {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }

  private async upload(file: File): Promise<void> {
    this.confirmRestore.set(false);
    if (this.busy()) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.error.set("That file isn't a PDF.");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      this.error.set('That file is over 4 MB.');
      return;
    }
    const body = await this.call('/api/admin/resume', {
      method: 'PUT',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    });
    if (!body) return;
    this.resume.current.set(body.resume ?? null);
    this.notice.set('Updated: every visitor now downloads this résumé.');
  }

  private authHeaders(): Record<string, string> {
    return { 'X-Admin-Password': encodeURIComponent(this.password) };
  }

  private async call(url: string, init: RequestInit): Promise<ApiBody | null> {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const res = await fetch(url, init);
      const body = res.headers.get('content-type')?.includes('application/json') ? ((await res.json()) as ApiBody) : null;
      if (res.ok && body) return body;
      if (body?.error === 'invalid' && body.errors) this.issues.set(body.errors);
      this.error.set(explain(res.status, body));
      // Password changed or lockout mid-session: back to the login step.
      if (this.unlocked() && (res.status === 401 || res.status === 429)) {
        this.password = '';
        this.unlocked.set(false);
      }
      return null;
    } catch {
      this.error.set('Network error. Check your connection and try again.');
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}
