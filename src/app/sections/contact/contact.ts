import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { profile } from '../../data/portfolio';
import { Arrow } from '../../shared/arrow';
import { Magnetic } from '../../shared/magnetic';
import { Reveal } from '../../shared/reveal';
import { SplitReveal } from '../../shared/split';

@Component({
  selector: 'app-contact',
  imports: [Arrow, Magnetic, Reveal, SplitReveal],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  protected readonly profile = profile;
  protected readonly copied = signal(false);
  protected readonly status = signal<'idle' | 'sending' | 'sent' | 'mailto' | 'invalid' | 'limited'>('idle');
  protected readonly note = computed(() => {
    switch (this.status()) {
      case 'sending':
        return 'Sending…';
      case 'sent':
        return 'Sent ✓ Thanks, I’ll reply soon.';
      case 'mailto':
        return 'Opening your email app…';
      case 'invalid':
        return 'Please check your details and try again.';
      case 'limited':
        return 'Too many messages. Please try again later.';
      default:
        return 'Goes straight to my inbox.';
    }
  });
  private copyTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copyTimer));
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(profile.email);
    } catch {
      return;
    }
    this.copied.set(true);
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copied.set(false), 2200);
  }

  /** Emails via the /api/contact function; if that isn't set up (or fails) it opens the visitor's mail app instead. */
  protected async send(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this.status() === 'sending') return;
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const fields = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      website: String(data.get('website') ?? ''),
    };

    this.status.set('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        form.reset();
        this.status.set('sent');
        return;
      }
      if (res.status === 400) return this.status.set('invalid');
      if (res.status === 429) return this.status.set('limited');
    } catch {
      // Offline or no backend: use the mail app below.
    }
    this.openMailApp(fields);
  }

  private openMailApp({ name, email, message }: { name: string; email: string; message: string }): void {
    const subject = `Portfolio enquiry from ${name}`;
    const body = `${message}\n\n— ${name}\n${email}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    this.status.set('mailto');
  }
}
