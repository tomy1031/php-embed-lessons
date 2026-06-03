import { getExecutor, getEditorFactory } from '@/runtime/config';
import { extractPhp } from './extract';
import { decideLayout } from './layout';
import { check, type MatchMode } from '@/checker/checker';
import { loadCode, saveCode, clearCode } from '@/storage/storage';
import type { CodeEditor } from '@/editor/types';

export class PhpExercise extends HTMLElement {
  private starter = '';
  private editor!: CodeEditor;
  private exerciseId = '';

  connectedCallback(): void {
    this.starter = extractPhp(this);
    this.exerciseId = this.resolveId();
    this.render();
    const saved = loadCode(this.exerciseId);
    const host = this.querySelector('.editor-host') as HTMLElement;
    this.editor = getEditorFactory()(host, saved ?? this.starter);
    this.editor.onChange((v) => saveCode(this.exerciseId, v));
  }

  private resolveId(): string {
    const explicit = this.getAttribute('id');
    if (explicit) return explicit;
    const all = Array.from(document.querySelectorAll('php-exercise'));
    const idx = all.indexOf(this);
    const path = typeof location !== 'undefined' ? location.pathname : '';
    return `${path}#${idx}`;
  }

  private render(): void {
    const layout = decideLayout(this.starter, this.getAttribute('layout') ?? 'split');
    const hasSolution = this.hasAttribute('solution');
    this.classList.add('php-exercise', `layout-${layout}`);
    this.innerHTML =
      '<div class="panes">' +
      '<div class="editor-host"></div>' +
      '<div class="output" aria-live="polite"></div>' +
      '</div>' +
      '<div class="controls">' +
      '<button class="run" type="button">▶ 実行</button>' +
      '<button class="reset" type="button">↺ スターターに戻す</button>' +
      // 答えを最初から見せない：solution ボタンは初回実行までは hidden。
      (hasSolution ? '<button class="solution" type="button" hidden>👁 答えを見る</button>' : '') +
      '<span class="result" role="status"></span>' +
      '</div>';
    (this.querySelector('.run') as HTMLButtonElement).addEventListener('click', () => void this.runCode());
    (this.querySelector('.reset') as HTMLButtonElement).addEventListener('click', () => this.reset());
    if (hasSolution) {
      (this.querySelector('.solution') as HTMLButtonElement).addEventListener('click', () => this.showSolution());
    }
  }

  // --- テスト用アクセサ ---
  getEditorValue(): string { return this.editor.getValue(); }
  setEditorValue(v: string): void { this.editor.setValue(v); }

  reset(): void {
    this.editor.setValue(this.starter);
    clearCode(this.exerciseId);
    this.clearResult();
  }

  showSolution(): void {
    this.editor.setValue(this.getAttribute('solution') ?? '');
  }

  private clearResult(): void {
    const r = this.querySelector('.result')!;
    r.textContent = '';
    r.className = 'result';
    const o = this.querySelector('.output')!;
    o.textContent = '';
    o.classList.remove('has-error');
  }

  async runCode(): Promise<void> {
    // 一度でも実行したら「答えを見る」ボタンを出す（solution 指定時のみ存在）。
    const sol = this.querySelector('.solution') as HTMLButtonElement | null;
    if (sol) sol.hidden = false;

    const code = this.editor.getValue();
    const out = this.querySelector('.output')!;
    const result = this.querySelector('.result')!;
    out.textContent = '実行中…';
    out.classList.remove('has-error');
    result.textContent = '';
    result.className = 'result';

    let res;
    try {
      res = await getExecutor().run(code);
    } catch (err) {
      out.textContent = String(err);
      out.classList.add('has-error');
      return;
    }
    out.textContent = res.stderr ? `${res.stdout}${res.stdout ? '\n' : ''}${res.stderr}` : res.stdout;
    if (res.stderr) out.classList.add('has-error');

    const expected = this.getAttribute('expected');
    if (expected !== null) {
      const mode = (this.getAttribute('match') as MatchMode | null) ?? 'exact';
      const c = check(res.stdout, expected, mode);
      result.textContent = c.pass ? '✓ 正解！' : '✗ 不正解';
      result.classList.add(c.pass ? 'pass' : 'fail');
    }
  }
}
