import { getExecutor } from '@/runtime/config';
import { extractPhp } from './extract';
import { decideLayout } from './layout';

export class PhpRun extends HTMLElement {
  private code = '';

  connectedCallback(): void {
    this.code = extractPhp(this);
    this.render();
  }

  private render(): void {
    const layout = decideLayout(this.code, this.getAttribute('layout'));
    this.classList.add('php-run', `layout-${layout}`);
    // すべてのコードに「▶ 実行」ボタンを置く（自動実行しない）。
    // 学習者が自分のタイミングで押せるようにし、「動いたの？」という疑問を残さない。
    const isFirst = document.querySelector('php-run') === this; // ページ最初の実行ボタン
    this.innerHTML =
      '<pre class="code"><code></code></pre>' +
      '<div class="controls">' +
      '<button class="run" type="button">▶ 実行</button>' +
      (isFirst
        ? '<span class="run-hint">← この「▶ 実行」ボタンを 押すと、プログラムが 実行されます</span>'
        : '') +
      '</div>' +
      '<div class="output" aria-live="polite" hidden></div>';
    this.querySelector('code')!.textContent = this.code; // コードはtextContentで安全に
    (this.querySelector('.run') as HTMLButtonElement).addEventListener('click', () => void this.execute());
  }

  async execute(): Promise<void> {
    const out = this.querySelector('.output') as HTMLElement;
    out.hidden = false;
    out.textContent = '実行中…';
    out.classList.remove('has-error');
    try {
      const res = await getExecutor().run(this.code);
      out.textContent = res.stderr ? `${res.stdout}${res.stdout ? '\n' : ''}${res.stderr}` : res.stdout;
      if (res.stderr) out.classList.add('has-error');
    } catch (err) {
      out.textContent = String(err);
      out.classList.add('has-error');
    }
    // 初回の説明ヒントは、一度押したら役目を終えるので消す。
    this.querySelector('.run-hint')?.remove();
  }
}
