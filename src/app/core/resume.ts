import { computed, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { profile } from '../data/portfolio';

export interface ResumeMeta {
  name: string;
  size: number;
  uploadedAt: string;
}

export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

export type StudioTab = 'resume' | 'projects' | 'journey' | 'highlights' | 'skills' | 'profile';

/** Where the résumé button points (the admin-uploaded PDF when there is one), plus the admin panel's visibility. */
@Injectable({ providedIn: 'root' })
export class ResumeService {
  readonly enabled = environment.ownerAdmin;
  /** Studio tab to show when the panel opens (the chatbot can deep-link, e.g. "add a project"). */
  readonly panelTab = signal<StudioTab>('resume');
  readonly current = signal<ResumeMeta | null>(null);
  readonly href = computed(() => {
    const uploaded = this.current();
    return uploaded ? `/api/resume?v=${encodeURIComponent(uploaded.uploadedAt)}` : profile.resume;
  });
  readonly panelOpen = signal(this.enabled && location.hash === '#admin');

  constructor() {
    if (!this.enabled) return;
    void this.refresh();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#admin') this.panelOpen.set(true);
    });
  }

  async refresh(): Promise<void> {
    try {
      const res = await fetch('/api/resume/info', { cache: 'no-store' });
      // A static-only deploy or the dev server answers with HTML: keep the bundled PDF.
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
      const { custom, ...meta } = (await res.json()) as { custom: boolean } & ResumeMeta;
      this.current.set(custom ? meta : null);
    } catch {
      // Offline: keep the bundled PDF.
    }
  }

  openPanel(tab: StudioTab = 'resume'): void {
    this.panelTab.set(tab);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    if (location.hash === '#admin') history.replaceState(history.state, '', location.pathname + location.search);
  }
}
