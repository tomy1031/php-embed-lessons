import { getExecutor } from '@/runtime/config';
import { extractPhp } from './extract';
import { decideLayout } from './layout';

export class PhpRun extends HTMLElement {
  private code = '';
  private executed = false;

  connectedCallback(): void {
    this.code = extractPhp(this);
    this.renderShell();
    this.observe();
  }

  private renderShell(): void {
    const layout = decideLayout(this.code, this.getAttribute('layout'));
    this.classList.add('php-run', `layout-${layout}`);
    this.innerHTML =
      '<pre class="code"><code></code></pre>' +
      '<div class="output" aria-live="polite"><span class="pending">…</span></div>';
    this.querySelector('code')!.textContent = this.code; // コードはtextContentで安全に
  }

  private observe(): void {
    if (typeof IntersectionObserver === 'undefined') { void this.execute(); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { io.disconnect(); void this.execute(); }
      }
    });
    io.observe(this);
  }

  async execute(): Promise<void> {
    if (this.executed) return;
    this.executed = true;
    const out = this.querySelector('.output')!;
    try {
      const res = await getExecutor().run(this.code);
      out.textContent = res.stderr ? `${res.stdout}${res.stdout ? '\n' : ''}${res.stderr}` : res.stdout;
      if (res.stderr) out.classList.add('has-error');
    } catch (err) {
      out.textContent = String(err);
      out.classList.add('has-error');
    }
  }
}
