# PHP埋め込み実行型 学習システム 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HTMLに `<php-run>` / `<php-exercise>` を置くだけで、ブラウザ内（php-wasm）でPHPを実行・採点できる学習システムのv1を作る。

**Architecture:** Vanilla Web Components（Custom Elements）＋「コード→出力」を返す `Executor` 抽象。v1のExecutorはphp-wasm。エディタ（CodeMirror）も `EditorFactory` で抽象化し、純粋ロジック（採点・レイアウト判定・抽出・保存）はFake実装でTDDする。ViteのMPAビルドで静的バンドルを出力し、無料ホスティングに公開してURL共有（配布v1=リンク）。

**Tech Stack:** TypeScript / Vite（MPA・dev/build/preview）/ Vitest＋jsdom（単体）/ Playwright（実ブラウザE2E）/ Web Components / php-wasm（seanmorris）/ CodeMirror 6（@codemirror/lang-php）/ marked（Markdown従の変換）

**前提環境:** Node.js 20以上、モダンブラウザ。作業ディレクトリは本リポジトリのルート。

**コミット規約:** すべてのコミットメッセージは末尾に次の行を付ける（リポジトリ既定）:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

参照する設計書: `docs/superpowers/specs/2026-06-02-php-embed-learning-system-design.md`

---

## ファイル構成（責務マップ）

```
TechEducate/
├─ package.json                      # スクリプト・依存
├─ tsconfig.json                     # TS設定
├─ vite.config.ts                    # MPAビルド・base './'・wasm設定
├─ vitest.config.ts                  # jsdom・setupファイル
├─ playwright.config.ts              # E2E（preview起動）
├─ test/setup.ts                     # jsdom用のIntersectionObserver等スタブ
├─ src/
│  ├─ executor/
│  │  ├─ types.ts                    # Executor / RunResult
│  │  ├─ wasm-executor.ts            # php-wasm実装（v1）
│  │  └─ fake-executor.ts            # テスト用Executor
│  ├─ editor/
│  │  ├─ types.ts                    # CodeEditor / EditorFactory
│  │  ├─ codemirror.ts               # CodeMirror実装（動的import）
│  │  └─ fake-editor.ts              # テスト用Editor
│  ├─ checker/checker.ts             # 採点（normalize / check）
│  ├─ storage/storage.ts            # localStorage保存・キー解決
│  ├─ components/
│  │  ├─ extract.ts                  # <script type=text/php>抽出・dedent
│  │  ├─ layout.ts                   # レイアウト判定
│  │  ├─ php-run.ts                  # 表示ブロック
│  │  └─ php-exercise.ts             # 演習ブロック
│  ├─ runtime/config.ts              # configure / getExecutor / getEditorFactory
│  ├─ styles/lesson.css              # ブロックの見た目（compact/split/responsive）
│  └─ index.ts                       # 既定設定＋Custom Elements登録（ランタイム入口）
├─ lessons/                          # 著者が書くHTMLレッスン（主）
│  ├─ index.html                     # 目次
│  ├─ 01-variables.html
│  ├─ 02-arrays.html
│  └─ 03-functions.html
├─ lessons-md/01-variables.md        # Markdownレッスン（従）の例
├─ build/md-to-html.ts               # Markdown→HTML（従）変換
├─ build/md-transform.ts            # フェンス→部品 変換（純粋関数）
└─ tests/e2e/lesson.spec.ts          # 実ブラウザでphp-wasm実行・採点を検証
```

各ユニットは1責務。`Executor` と `EditorFactory` の抽象により、コンポーネントは外部依存（wasm/CodeMirror）なしでテストできる。

---

## Task 1: プロジェクト雛形（Vite + TS + Vitest + Playwright）

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `test/setup.ts`, `lessons/index.html`

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "php-embed-lessons",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "build:md": "tsx build/md-to-html.ts"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/node": "^22.0.0",
    "jsdom": "^25.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "@codemirror/lang-php": "^6.0.1",
    "@codemirror/state": "^6.4.1",
    "@codemirror/view": "^6.34.0",
    "codemirror": "^6.0.1",
    "marked": "^14.1.0",
    "php-wasm": "^0.0.9"
  }
}
```

> 注: `php-wasm` はα版のためバージョンが動く可能性あり。Task 9のスパイクで実バージョンのAPIを確認し、必要なら固定する。

- [ ] **Step 2: tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "build", "test", "tests"]
}
```

- [ ] **Step 3: vite.config.ts を作成（MPA・base相対・wasm配慮）**

```ts
import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const lessonsDir = resolve(__dirname, 'lessons');
const input: Record<string, string> = {};
for (const f of readdirSync(lessonsDir)) {
  if (f.endsWith('.html')) input[f.replace(/\.html$/, '')] = resolve(lessonsDir, f);
}

export default defineConfig({
  base: './',                       // どのホスト/サブパスでも動くよう相対パス
  // root はプロジェクトルートのまま（lessons/*.html から /src/index.ts を解決できるように）
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: { exclude: ['php-wasm'] },  // wasmのprebundleを避ける
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input } },
});
```

> dev/preview/E2E ではレッスンは `/lessons/<name>.html` のパスで配信される（root=プロジェクトルートのため）。ビルド成果物は `dist/lessons/*.html` ＋ `dist/assets/`。

- [ ] **Step 4: vitest.config.ts を作成**

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: test/setup.ts を作成（jsdomに無いAPIをスタブ）**

```ts
// jsdomにはIntersectionObserverが無いので、observe時に即「表示中」を通知するスタブ
class IOStub {
  constructor(private cb: (entries: { isIntersecting: boolean; target: Element }[]) => void) {}
  observe(el: Element) { this.cb([{ isIntersecting: true, target: el }]); }
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error テスト環境への注入
globalThis.IntersectionObserver = IOStub;
```

- [ ] **Step 6: playwright.config.ts を作成（ビルド成果物をpreviewで検証）**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/lessons/01-variables.html',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://localhost:4173' },
});
```

- [ ] **Step 7: 仮の lessons/index.html を作成（ビルド入口確保）**

```html
<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>PHPレッスン</title></head>
<body><h1>PHPレッスン</h1><p>準備中</p></body></html>
```

- [ ] **Step 8: 依存をインストール**

Run: `npm install`
Expected: 依存が解決し `node_modules/` が作成される（エラーなし）。

- [ ] **Step 9: Playwrightブラウザを取得**

Run: `npx playwright install chromium`
Expected: Chromiumがダウンロードされる。

- [ ] **Step 10: コミット**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts test/setup.ts lessons/index.html package-lock.json
git commit -m "chore: scaffold Vite+TS+Vitest+Playwright project

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Executor抽象・Fake・ランタイム設定

**Files:**
- Create: `src/executor/types.ts`, `src/executor/fake-executor.ts`, `src/runtime/config.ts`
- Test: `src/runtime/config.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/runtime/config.test.ts`:
```ts
import { configure, getExecutor } from './config';
import { FakeExecutor } from '@/executor/fake-executor';

describe('runtime config', () => {
  it('未設定でgetExecutorは例外', () => {
    // 別importの汚染を避けるため動的に再読み込み
    expect(() => getExecutor()).toThrow();
  });
  it('configureしたexecutorを返す', async () => {
    const fake = new FakeExecutor({ stdout: 'hi' });
    configure({ executor: fake });
    const res = await getExecutor().run('echo "hi";');
    expect(res.stdout).toBe('hi');
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/runtime/config.test.ts`
Expected: FAIL（`config`/`fake-executor` 未作成でモジュール解決エラー）

- [ ] **Step 3: 型を実装** — `src/executor/types.ts`:
```ts
export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
export interface Executor {
  run(code: string, opts?: { timeoutMs?: number }): Promise<RunResult>;
}
```

- [ ] **Step 4: Fakeを実装** — `src/executor/fake-executor.ts`:
```ts
import type { Executor, RunResult } from './types';

export class FakeExecutor implements Executor {
  public lastCode = '';
  constructor(private preset: Partial<RunResult> = {}) {}
  async run(code: string): Promise<RunResult> {
    this.lastCode = code;
    return {
      stdout: this.preset.stdout ?? '',
      stderr: this.preset.stderr ?? '',
      exitCode: this.preset.exitCode ?? 0,
      durationMs: 0,
    };
  }
}
```

- [ ] **Step 5: configを実装** — `src/runtime/config.ts`:
```ts
import type { Executor } from '@/executor/types';
import type { EditorFactory } from '@/editor/types';

interface PhpLessonConfig {
  executor: Executor;
  editorFactory: EditorFactory;
}
let current: Partial<PhpLessonConfig> = {};

export function configure(cfg: Partial<PhpLessonConfig>): void {
  current = { ...current, ...cfg };
}
export function getExecutor(): Executor {
  if (!current.executor) throw new Error('Executor is not configured');
  return current.executor;
}
export function getEditorFactory(): EditorFactory {
  if (!current.editorFactory) throw new Error('EditorFactory is not configured');
  return current.editorFactory;
}
```

> `EditorFactory` 型はTask 6で作成する `src/editor/types.ts` を参照する。型のみの依存なので、このTaskではTask 6 Step 3の `src/editor/types.ts` を先に作成してよい（下記）。

- [ ] **Step 6: editor型の最小定義を先行作成** — `src/editor/types.ts`:
```ts
export interface CodeEditor {
  getValue(): string;
  setValue(value: string): void;
  onChange(cb: (value: string) => void): void;
  destroy(): void;
}
export type EditorFactory = (host: HTMLElement, initial: string) => CodeEditor;
```

- [ ] **Step 7: テストを実行して成功を確認**

Run: `npm test -- src/runtime/config.test.ts`
Expected: PASS（2件）

- [ ] **Step 8: コミット**

```bash
git add src/executor/types.ts src/executor/fake-executor.ts src/runtime/config.ts src/editor/types.ts src/runtime/config.test.ts
git commit -m "feat: add Executor abstraction, FakeExecutor and runtime config

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Checker（採点ロジック）

**Files:**
- Create: `src/checker/checker.ts`
- Test: `src/checker/checker.test.ts`

- [ ] **Step 1: 失敗するテストを書く** — `src/checker/checker.test.ts`:
```ts
import { normalize, check } from './checker';

describe('normalize', () => {
  it('CRLFをLFに統一し前後空白と行末空白を除去', () => {
    expect(normalize('  a  \r\nb \r\n')).toBe('a\nb');
  });
});
describe('check', () => {
  it('exact: 正規化後に一致でpass', () => {
    expect(check('15\n', '15').pass).toBe(true);
  });
  it('exact: 不一致でfail', () => {
    expect(check('16', '15').pass).toBe(false);
  });
  it('contains: 部分一致でpass', () => {
    expect(check('answer=15 ok', '15', 'contains').pass).toBe(true);
  });
  it('正規化結果を返す', () => {
    const r = check('15 \n', ' 15');
    expect(r.normalizedActual).toBe('15');
    expect(r.normalizedExpected).toBe('15');
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/checker/checker.test.ts`
Expected: FAIL（`checker` 未作成）

- [ ] **Step 3: 実装** — `src/checker/checker.ts`:
```ts
export type MatchMode = 'exact' | 'contains';
export interface CheckResult {
  pass: boolean;
  normalizedExpected: string;
  normalizedActual: string;
}

export function normalize(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

export function check(actual: string, expected: string, mode: MatchMode = 'exact'): CheckResult {
  const normalizedActual = normalize(actual);
  const normalizedExpected = normalize(expected);
  const pass =
    mode === 'contains'
      ? normalizedActual.includes(normalizedExpected)
      : normalizedActual === normalizedExpected;
  return { pass, normalizedExpected, normalizedActual };
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm test -- src/checker/checker.test.ts`
Expected: PASS（5件）

- [ ] **Step 5: コミット**

```bash
git add src/checker/checker.ts src/checker/checker.test.ts
git commit -m "feat: add output checker with normalization (exact/contains)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 抽出・dedent・レイアウト判定ユーティリティ

**Files:**
- Create: `src/components/extract.ts`, `src/components/layout.ts`
- Test: `src/components/extract.test.ts`, `src/components/layout.test.ts`

- [ ] **Step 1: 失敗するテストを書く** — `src/components/layout.test.ts`:
```ts
import { nonEmptyLineCount, decideLayout } from './layout';

describe('layout', () => {
  it('空行を除いた行数を数える', () => {
    expect(nonEmptyLineCount('a\n\n b ')).toBe(2);
  });
  it('1行はcompact、複数行はsplit', () => {
    expect(decideLayout('echo 1;')).toBe('compact');
    expect(decideLayout('a;\nb;')).toBe('split');
  });
  it('overrideを優先', () => {
    expect(decideLayout('echo 1;', 'split')).toBe('split');
    expect(decideLayout('a;\nb;', 'stacked')).toBe('stacked');
  });
});
```

- [ ] **Step 2: 失敗するテストを書く** — `src/components/extract.test.ts`:
```ts
import { dedent, extractPhp } from './extract';

describe('dedent', () => {
  it('共通インデントを除去し前後の空行を落とす', () => {
    expect(dedent('\n    $a = 1;\n    $b = 2;\n')).toBe('$a = 1;\n$b = 2;');
  });
});
describe('extractPhp', () => {
  it('script[type=text/php]の中身を取り出す', () => {
    const el = document.createElement('div');
    el.innerHTML = '<script type="text/php">  echo 1;  </script>';
    expect(extractPhp(el)).toBe('echo 1;');
  });
});
```

- [ ] **Step 3: 実行して失敗を確認**

Run: `npm test -- src/components/layout.test.ts src/components/extract.test.ts`
Expected: FAIL（両モジュール未作成）

- [ ] **Step 4: 実装** — `src/components/layout.ts`:
```ts
export type Layout = 'compact' | 'split' | 'stacked';

export function nonEmptyLineCount(code: string): number {
  return code.split('\n').filter((l) => l.trim().length > 0).length;
}

export function decideLayout(code: string, override?: string | null): Layout {
  if (override === 'compact' || override === 'split' || override === 'stacked') return override;
  return nonEmptyLineCount(code) <= 1 ? 'compact' : 'split';
}
```

- [ ] **Step 5: 実装** — `src/components/extract.ts`:
```ts
export function dedent(s: string): string {
  const lines = s.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => (l.match(/^[ \t]*/)?.[0].length ?? 0));
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

export function extractPhp(el: Element): string {
  const script = el.querySelector('script[type="text/php"]');
  const raw = script ? (script.textContent ?? '') : (el.textContent ?? '');
  return dedent(raw);
}
```

- [ ] **Step 6: テストを実行して成功を確認**

Run: `npm test -- src/components/layout.test.ts src/components/extract.test.ts`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/components/extract.ts src/components/layout.ts src/components/extract.test.ts src/components/layout.test.ts
git commit -m "feat: add php extraction/dedent and layout decision utils

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: localStorage保存・キー解決

**Files:**
- Create: `src/storage/storage.ts`
- Test: `src/storage/storage.test.ts`

- [ ] **Step 1: 失敗するテストを書く** — `src/storage/storage.test.ts`:
```ts
import { saveCode, loadCode, clearCode } from './storage';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('保存して読み出せる', () => {
    saveCode('a#0', 'echo 1;');
    expect(loadCode('a#0')).toBe('echo 1;');
  });
  it('未保存はnull', () => {
    expect(loadCode('missing')).toBeNull();
  });
  it('削除できる', () => {
    saveCode('a#0', 'x');
    clearCode('a#0');
    expect(loadCode('a#0')).toBeNull();
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/storage/storage.test.ts`
Expected: FAIL（`storage` 未作成）

- [ ] **Step 3: 実装** — `src/storage/storage.ts`:
```ts
const PREFIX = 'phplesson:exercise:';

export function loadCode(id: string): string | null {
  try { return localStorage.getItem(PREFIX + id); } catch { return null; }
}
export function saveCode(id: string, code: string): void {
  try { localStorage.setItem(PREFIX + id, code); } catch { /* quota/無効時は無視 */ }
}
export function clearCode(id: string): void {
  try { localStorage.removeItem(PREFIX + id); } catch { /* 無視 */ }
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm test -- src/storage/storage.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: コミット**

```bash
git add src/storage/storage.ts src/storage/storage.test.ts
git commit -m "feat: add localStorage persistence for exercise code

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 表示ブロック `<php-run>`

**Files:**
- Create: `src/components/php-run.ts`
- Test: `src/components/php-run.test.ts`

- [ ] **Step 1: 失敗するテストを書く** — `src/components/php-run.test.ts`:
```ts
import { PhpRun } from './php-run';
import { configure } from '@/runtime/config';
import { FakeExecutor } from '@/executor/fake-executor';

beforeAll(() => {
  if (!customElements.get('php-run')) customElements.define('php-run', PhpRun);
});

function mount(html: string): PhpRun {
  const el = document.createElement('php-run') as PhpRun;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('<php-run>', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('実行結果をoutputに表示する', async () => {
    configure({ executor: new FakeExecutor({ stdout: 'こんにちは' }) });
    const el = mount('<script type="text/php">echo "x";</script>');
    await el.execute();
    expect(el.querySelector('.output')!.textContent).toBe('こんにちは');
  });

  it('1行はcompactレイアウト', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('<script type="text/php">echo 1;</script>');
    expect(el.classList.contains('layout-compact')).toBe(true);
  });

  it('複数行はsplitレイアウト', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('<script type="text/php">$a=1;\necho $a;</script>');
    expect(el.classList.contains('layout-split')).toBe(true);
  });

  it('stderrはエラー表示になる', async () => {
    configure({ executor: new FakeExecutor({ stdout: '', stderr: 'Parse error' }) });
    const el = mount('<script type="text/php">bad</script>');
    await el.execute();
    expect(el.querySelector('.output')!.classList.contains('has-error')).toBe(true);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/components/php-run.test.ts`
Expected: FAIL（`php-run` 未作成）

- [ ] **Step 3: 実装** — `src/components/php-run.ts`:
```ts
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
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm test -- src/components/php-run.test.ts`
Expected: PASS（4件）

- [ ] **Step 5: コミット**

```bash
git add src/components/php-run.ts src/components/php-run.test.ts
git commit -m "feat: add <php-run> display block component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: テスト用Editor（FakeEditor）

**Files:**
- Create: `src/editor/fake-editor.ts`
- Test: `src/editor/fake-editor.test.ts`

> 目的: Task 8の `<php-exercise>` をCodeMirror無しでテストするための、`EditorFactory` 準拠のFake。

- [ ] **Step 1: 失敗するテストを書く** — `src/editor/fake-editor.test.ts`:
```ts
import { fakeEditorFactory } from './fake-editor';

describe('fakeEditorFactory', () => {
  it('初期値を保持しget/setできる', () => {
    const ed = fakeEditorFactory(document.createElement('div'), 'init');
    expect(ed.getValue()).toBe('init');
    ed.setValue('next');
    expect(ed.getValue()).toBe('next');
  });
  it('onChangeはsetValueで発火する', () => {
    const ed = fakeEditorFactory(document.createElement('div'), '');
    let seen = '';
    ed.onChange((v) => (seen = v));
    ed.setValue('x');
    expect(seen).toBe('x');
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/editor/fake-editor.test.ts`
Expected: FAIL（`fake-editor` 未作成）

- [ ] **Step 3: 実装** — `src/editor/fake-editor.ts`:
```ts
import type { CodeEditor, EditorFactory } from './types';

export const fakeEditorFactory: EditorFactory = (_host: HTMLElement, initial: string): CodeEditor => {
  let value = initial;
  let changeCb: (v: string) => void = () => {};
  return {
    getValue: () => value,
    setValue: (v: string) => { value = v; changeCb(v); },
    onChange: (cb) => { changeCb = cb; },
    destroy: () => {},
  };
};
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm test -- src/editor/fake-editor.test.ts`
Expected: PASS（2件）

- [ ] **Step 5: コミット**

```bash
git add src/editor/fake-editor.ts src/editor/fake-editor.test.ts
git commit -m "test: add fake editor factory for component tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 演習ブロック `<php-exercise>`

**Files:**
- Create: `src/components/php-exercise.ts`
- Test: `src/components/php-exercise.test.ts`

- [ ] **Step 1: 失敗するテストを書く** — `src/components/php-exercise.test.ts`:
```ts
import { PhpExercise } from './php-exercise';
import { configure } from '@/runtime/config';
import { FakeExecutor } from '@/executor/fake-executor';
import { fakeEditorFactory } from '@/editor/fake-editor';

beforeAll(() => {
  if (!customElements.get('php-exercise')) customElements.define('php-exercise', PhpExercise);
});

function mount(attrs: string, php: string): PhpExercise {
  const el = document.createElement('php-exercise') as PhpExercise;
  for (const a of attrs.split(' ').filter(Boolean)) {
    const [k, v] = a.split('=');
    el.setAttribute(k, v ? v.replace(/"/g, '') : '');
  }
  el.innerHTML = `<script type="text/php">${php}</script>`;
  document.body.appendChild(el);
  return el;
}

describe('<php-exercise>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    configure({ editorFactory: fakeEditorFactory });
  });

  it('スターターコードがエディタ初期値になる', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('', '$a = 7;');
    expect(el.getEditorValue()).toBe('$a = 7;');
  });

  it('expected一致で正解表示', async () => {
    configure({ executor: new FakeExecutor({ stdout: '15' }) });
    const el = mount('expected="15"', '// code');
    await el.runCode();
    expect(el.querySelector('.result')!.textContent).toContain('正解');
    expect(el.querySelector('.result')!.classList.contains('pass')).toBe(true);
  });

  it('expected不一致で不正解表示', async () => {
    configure({ executor: new FakeExecutor({ stdout: '16' }) });
    const el = mount('expected="15"', '// code');
    await el.runCode();
    expect(el.querySelector('.result')!.textContent).toContain('不正解');
    expect(el.querySelector('.result')!.classList.contains('fail')).toBe(true);
  });

  it('expected無しは採点しない', async () => {
    configure({ executor: new FakeExecutor({ stdout: 'anything' }) });
    const el = mount('', '// free');
    await el.runCode();
    expect(el.querySelector('.result')!.textContent).toBe('');
  });

  it('リセットでスターターに戻り保存も消える', async () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('id="ex1"', 'START');
    el.setEditorValue('CHANGED');
    expect(localStorage.getItem('phplesson:exercise:ex1')).toBe('CHANGED');
    el.reset();
    expect(el.getEditorValue()).toBe('START');
    expect(localStorage.getItem('phplesson:exercise:ex1')).toBeNull();
  });

  it('保存済みコードがあれば復元する', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    localStorage.setItem('phplesson:exercise:ex2', 'SAVED');
    const el = mount('id="ex2"', 'START');
    expect(el.getEditorValue()).toBe('SAVED');
  });

  it('solution指定時のみ模範解答ボタンが出て反映される', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('solution="echo "ans";"', 'START');
    const btn = el.querySelector('.solution') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(el.getEditorValue()).toContain('ans');
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/components/php-exercise.test.ts`
Expected: FAIL（`php-exercise` 未作成）

- [ ] **Step 3: 実装** — `src/components/php-exercise.ts`:
```ts
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
      (hasSolution ? '<button class="solution" type="button">👁 模範解答</button>' : '') +
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
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm test -- src/components/php-exercise.test.ts`
Expected: PASS（7件）

- [ ] **Step 5: コミット**

```bash
git add src/components/php-exercise.ts src/components/php-exercise.test.ts
git commit -m "feat: add <php-exercise> editable block with grading and persistence

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: php-wasm実行エンジン（実装＋スパイク＋E2Eスモーク）

**Files:**
- Create: `src/editor/codemirror.ts`, `src/executor/wasm-executor.ts`, `src/index.ts`, `src/styles/lesson.css`, `lessons/01-variables.html`, `tests/e2e/lesson.spec.ts`
- Modify: `lessons/index.html`

> このTaskだけ外部wasm/CodeMirrorの実APIに依存する。**まずスパイクでAPIを確認**し、実装を合わせる。検証は実ブラウザ（Playwright）で行う。

- [ ] **Step 1: php-wasm APIスパイク（読むだけ）**

Run: `cat node_modules/php-wasm/README.md | head -120` および `ls node_modules/php-wasm`
確認事項:
- Webエントリの正確なパス（例 `php-wasm/PhpWeb.mjs`）と公開クラス名（`PhpWeb`）。
- 実行API（`php.run(source)` の戻り値）、出力の受け取り方（`output`/`error` イベント、`event.detail` の型＝文字列か配列か）。
- 準備完了の待ち方（`ready` イベント or 直接await可能か）、状態リセット（`refresh()` の有無）。
メモ: 下記実装は一般的な形。差異があればimportパス・メソッド名・イベント名をこのStepの確認結果に合わせて修正する。

- [ ] **Step 2: CodeMirrorエディタを実装** — `src/editor/codemirror.ts`:
```ts
import type { CodeEditor, EditorFactory } from './types';

// 表示専用ページにCodeMirrorを読み込ませないよう、生成時に動的import
export const codeMirrorFactory: EditorFactory = (host: HTMLElement, initial: string): CodeEditor => {
  let view: import('@codemirror/view').EditorView | undefined;
  let value = initial;
  let changeCb: (v: string) => void = () => {};

  const ready = (async () => {
    const [{ EditorView }, { basicSetup }, { php }, { EditorState }] = await Promise.all([
      import('@codemirror/view'),
      import('codemirror'),       // basicSetup（履歴・既定キーマップ等を内包）
      import('@codemirror/lang-php'),
      import('@codemirror/state'),
    ]);
    const listener = EditorView.updateListener.of((u) => {
      if (u.docChanged) { value = u.state.doc.toString(); changeCb(value); }
    });
    view = new EditorView({
      parent: host,
      state: EditorState.create({ doc: initial, extensions: [basicSetup, php(), listener] }),
    });
  })();

  return {
    getValue: () => (view ? view.state.doc.toString() : value),
    setValue: (v: string) => {
      value = v;
      if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
    },
    onChange: (cb) => { changeCb = cb; },
    destroy: () => { void ready.then(() => view?.destroy()); },
  };
};
```
> 注: `basicSetup` は `codemirror` パッケージから、`php` は `@codemirror/lang-php` から提供される（Step1スパイクで版を確認）。追加依存は不要。

- [ ] **Step 3: WasmExecutorを実装** — `src/executor/wasm-executor.ts`:
```ts
import type { Executor, RunResult } from './types';

function toText(detail: unknown): string {
  if (Array.isArray(detail)) return detail.join('');
  return detail == null ? '' : String(detail);
}

export class WasmExecutor implements Executor {
  private phpPromise: Promise<any> | null = null;

  private getPhp(): Promise<any> {
    if (!this.phpPromise) {
      this.phpPromise = (async () => {
        // Step1スパイクで確認した実パスに合わせる
        const mod: any = await import('php-wasm/PhpWeb.mjs');
        const PhpWeb = mod.PhpWeb ?? mod.default;
        const php = new PhpWeb();
        if (typeof php.addEventListener === 'function') {
          await new Promise<void>((resolve) => {
            let done = false;
            const ok = () => { if (!done) { done = true; resolve(); } };
            php.addEventListener('ready', ok, { once: true });
            // 既にreadyな実装向けの保険
            setTimeout(ok, 3000);
          });
        }
        return php;
      })();
    }
    return this.phpPromise;
  }

  async run(code: string): Promise<RunResult> {
    const php = await this.getPhp();
    if (typeof php.refresh === 'function') {
      await php.refresh(); // 実行ごとに状態を初期化（関数再宣言エラー等を防ぐ）
    }
    let stdout = '';
    let stderr = '';
    const onOut = (e: any) => { stdout += toText(e.detail); };
    const onErr = (e: any) => { stderr += toText(e.detail); };
    php.addEventListener?.('output', onOut);
    php.addEventListener?.('error', onErr);

    const start = performance.now();
    let exitCode = 0;
    try {
      const trimmed = code.trimStart();
      const src = trimmed.startsWith('<?php') || trimmed.startsWith('<?') ? code : `<?php\n${code}`;
      exitCode = (await php.run(src)) ?? 0;
    } finally {
      php.removeEventListener?.('output', onOut);
      php.removeEventListener?.('error', onErr);
    }
    return { stdout, stderr, exitCode, durationMs: performance.now() - start };
  }
}
```

- [ ] **Step 4: スタイルを作成** — `src/styles/lesson.css`:
```css
.php-run, .php-exercise { display: block; margin: 1.2rem 0; border: 1px solid #d8dee9;
  border-radius: 8px; overflow: hidden; font-family: ui-monospace, Menlo, Consolas, monospace; }
.php-run .code, .php-exercise .editor-host { margin: 0; padding: .6rem .8rem; background: #1e1e2e; color: #cdd6f4; }
.php-run .output, .php-exercise .output { padding: .6rem .8rem; background: #11221a; color: #a6e3a1;
  white-space: pre-wrap; min-height: 1.4em; }
.php-run .output.has-error, .php-exercise .output.has-error { background: #2a1620; color: #f38ba8; }
/* 1行=縦積み（コード→結果） */
.layout-compact .code, .layout-compact .output { display: block; }
/* 複数行=左右 */
.layout-split .panes, .php-run.layout-split { display: grid; grid-template-columns: 1fr 1fr; }
.php-exercise .panes { display: grid; grid-template-columns: 1fr 1fr; }
.php-exercise .controls { display: flex; gap: .5rem; align-items: center; padding: .5rem .8rem; background: #181825; }
.php-exercise button { cursor: pointer; border: 0; border-radius: 4px; padding: .25rem .8rem; }
.php-exercise .run { background: #2563eb; color: #fff; }
.php-exercise .result.pass { color: #16a34a; font-weight: 700; }
.php-exercise .result.fail { color: #dc2626; font-weight: 700; }
@media (max-width: 640px) {
  .php-run.layout-split, .php-exercise .panes { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: ランタイム入口を実装** — `src/index.ts`:
```ts
import { configure } from './runtime/config';
import { WasmExecutor } from './executor/wasm-executor';
import { codeMirrorFactory } from './editor/codemirror';
import { PhpRun } from './components/php-run';
import { PhpExercise } from './components/php-exercise';
import './styles/lesson.css';

configure({ executor: new WasmExecutor(), editorFactory: codeMirrorFactory });

if (!customElements.get('php-run')) customElements.define('php-run', PhpRun);
if (!customElements.get('php-exercise')) customElements.define('php-exercise', PhpExercise);

export { configure };
```

- [ ] **Step 6: 最初の実レッスンを作成** — `lessons/01-variables.html`:
```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>変数を学ぼう</title>
  <script type="module" src="/src/index.ts"></script>
</head>
<body>
  <article class="lesson">
    <h1>変数を学ぼう</h1>
    <p>変数は値の入れ物です。<code>$名前</code> で作ります。</p>

    <php-run><script type="text/php">echo "こんにちは";</script></php-run>

    <p>計算もできます。</p>
    <php-run><script type="text/php">
$a = 7;
$b = 8;
echo $a + $b;
    </script></php-run>

    <h2>練習：合計を出力しよう</h2>
    <p>$a と $b を足した値（15）を出力してください。</p>
    <php-exercise expected="15" solution='<?php echo 7 + 8;'>
      <script type="text/php">
$a = 7;
$b = 8;
// ここに答えを書く
      </script>
    </php-exercise>
  </article>
</body>
</html>
```

- [ ] **Step 7: index.html を目次に更新** — `lessons/index.html`:
```html
<!doctype html>
<html lang="ja">
<head><meta charset="utf-8" /><title>PHPレッスン目次</title></head>
<body>
  <h1>PHPレッスン</h1>
  <ul>
    <li><a href="./01-variables.html">01. 変数を学ぼう</a></li>
  </ul>
</body>
</html>
```

- [ ] **Step 8: E2Eスモークテストを書く** — `tests/e2e/lesson.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('php-run が実ブラウザで実行され出力が出る', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const firstRun = page.locator('php-run .output').first();
  await expect(firstRun).toHaveText('こんにちは', { timeout: 60_000 });
});

test('php-exercise: 正答すると正解が出る', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const ex = page.locator('php-exercise');
  // CodeMirrorのエディタを全選択→置換で確実に入力
  await ex.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('$a = 7; $b = 8; echo $a + $b;');
  await ex.locator('button.run').click();
  await expect(ex.locator('.result')).toContainText('正解', { timeout: 60_000 });
});
```
> 注: CodeMirrorのDOMセレクタ（`.cm-content`）と全選択キー（`ControlOrMeta+a`）はStep1スパイクで確認し、差異があれば修正する。

- [ ] **Step 9: 単体テストが全て緑であることを確認**

Run: `npm test`
Expected: これまでの全ユニットテストPASS（wasm/CodeMirrorは動的importのため単体では読み込まれない）。

- [ ] **Step 10: E2E（実ブラウザでphp-wasm）を実行**

Run: `npm run e2e`
Expected: 2テストPASS。`php-run` に「こんにちは」、演習で「正解」。
失敗時の調査順:
1. Step1スパイクの import パス/イベント名/`detail` 型を再確認し `wasm-executor.ts` を修正。
2. ビルドにwasmが含まれるか（`dist/assets` に `.wasm`）。含まれない場合は `vite-plugin-wasm` 追加や `optimizeDeps.exclude` を見直す。
3. CodeMirror入力セレクタ（`.cm-content`）をスパイクで確認。

- [ ] **Step 11: コミット**

```bash
git add src/editor/codemirror.ts src/executor/wasm-executor.ts src/index.ts src/styles/lesson.css lessons/01-variables.html lessons/index.html tests/e2e/lesson.spec.ts package.json package-lock.json
git commit -m "feat: wire php-wasm executor + CodeMirror, first lesson, e2e smoke

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: サンプルレッスンを追加（配列・関数）

**Files:**
- Create: `lessons/02-arrays.html`, `lessons/03-functions.html`
- Modify: `lessons/index.html`

- [ ] **Step 1: 配列レッスンを作成** — `lessons/02-arrays.html`:
```html
<!doctype html>
<html lang="ja">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>配列を学ぼう</title><script type="module" src="/src/index.ts"></script></head>
<body>
  <article class="lesson">
    <h1>配列を学ぼう</h1>
    <p>配列は複数の値をまとめて持てます。</p>
    <php-run><script type="text/php">
$fruits = ["りんご", "みかん", "ばなな"];
echo $fruits[1];
    </script></php-run>

    <h2>練習：合計を出そう（採点なし・自由練習）</h2>
    <p>配列の数を全部足して出力してみましょう。</p>
    <php-exercise>
      <script type="text/php">
$nums = [1, 2, 3, 4];
// array_sum を使ってみよう
      </script>
    </php-exercise>

    <h2>練習：要素数を出力（採点あり）</h2>
    <php-exercise expected="3" solution='<?php echo count(["a","b","c"]);'>
      <script type="text/php">
$items = ["a", "b", "c"];
// 要素数(3)を出力
      </script>
    </php-exercise>
  </article>
</body>
</html>
```

- [ ] **Step 2: 関数レッスンを作成** — `lessons/03-functions.html`:
```html
<!doctype html>
<html lang="ja">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>関数を学ぼう</title><script type="module" src="/src/index.ts"></script></head>
<body>
  <article class="lesson">
    <h1>関数を学ぼう</h1>
    <p>処理に名前をつけて再利用できます。</p>
    <php-run><script type="text/php">
function greet($name) {
    return "やあ、{$name}さん";
}
echo greet("PHP");
    </script></php-run>

    <h2>練習：2倍にする関数（採点あり）</h2>
    <p><code>double(5)</code> が 10 を返すように実装し、結果を出力してください。</p>
    <php-exercise expected="10" solution='<?php function double($n){return $n*2;} echo double(5);'>
      <script type="text/php">
function double($n) {
    // ここを実装
}
echo double(5);
      </script>
    </php-exercise>
  </article>
</body>
</html>
```

- [ ] **Step 3: 目次を更新** — `lessons/index.html` の `<ul>` を置換:
```html
  <ul>
    <li><a href="./01-variables.html">01. 変数を学ぼう</a></li>
    <li><a href="./02-arrays.html">02. 配列を学ぼう</a></li>
    <li><a href="./03-functions.html">03. 関数を学ぼう</a></li>
  </ul>
```

- [ ] **Step 4: ビルドが通ることを確認**

Run: `npm run build`
Expected: `dist/` に `01-variables.html` `02-arrays.html` `03-functions.html` `index.html` とassets（`.js`/`.wasm`/`.css`）が生成される。エラーなし。

- [ ] **Step 5: コミット**

```bash
git add lessons/02-arrays.html lessons/03-functions.html lessons/index.html
git commit -m "docs: add array and function sample lessons (3 lessons total)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Markdown→HTML 変換（従の道）

**Files:**
- Create: `build/md-transform.ts`, `build/md-to-html.ts`, `lessons-md/01-variables.md`
- Test: `build/md-transform.test.ts`

- [ ] **Step 1: 失敗するテストを書く** — `build/md-transform.test.ts`:
```ts
import { transformFences } from './md-transform';

describe('transformFences', () => {
  it('```php run を <php-run> に変換', () => {
    const md = '```php run\necho 1;\n```';
    expect(transformFences(md)).toBe(
      '<php-run><script type="text/php">\necho 1;\n</script></php-run>'
    );
  });
  it('```php exercise expected="15" を属性付き<php-exercise>に変換', () => {
    const md = '```php exercise expected="15"\n$a=1;\n```';
    expect(transformFences(md)).toBe(
      '<php-exercise expected="15"><script type="text/php">\n$a=1;\n</script></php-exercise>'
    );
  });
  it('通常のmarkdownはそのまま', () => {
    expect(transformFences('# 見出し\n本文')).toBe('# 見出し\n本文');
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- build/md-transform.test.ts`
Expected: FAIL（`md-transform` 未作成）

- [ ] **Step 3: 変換（純粋関数）を実装** — `build/md-transform.ts`:
```ts
// ```php run / ```php exercise <属性...> のフェンスを部品に変換する。
// それ以外のmarkdownは触らない（marked本体はmd-to-html側で処理）。
const FENCE = /```php (run|exercise)([^\n]*)\n([\s\S]*?)\n```/g;

export function transformFences(md: string): string {
  return md.replace(FENCE, (_m, kind: string, attrs: string, code: string) => {
    const tag = kind === 'run' ? 'php-run' : 'php-exercise';
    const attrStr = attrs.trim() ? ` ${attrs.trim()}` : '';
    return `<${tag}${attrStr}><script type="text/php">\n${code}\n</script></${tag}>`;
  });
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm test -- build/md-transform.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: md→htmlビルダを実装** — `build/md-to-html.ts`:
```ts
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { marked } from 'marked';
import { transformFences } from './md-transform';

const SRC = resolve('lessons-md');
const OUT = resolve('lessons');

function pageHtml(title: string, body: string): string {
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title><script type="module" src="/src/index.ts"></script></head>
<body><article class="lesson">
${body}
</article></body>
</html>
`;
}

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(SRC)) {
  if (!f.endsWith('.md')) continue;
  const md = readFileSync(resolve(SRC, f), 'utf8');
  // 先にフェンスを部品へ。部品（HTML）はmarkedがそのまま通す。
  const html = marked.parse(transformFences(md), { async: false }) as string;
  const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? basename(f, '.md')).trim();
  // 手書きHTML(lessons/01-variables.html等)と衝突しないよう md- を前置
  const outName = 'md-' + basename(f, '.md') + '.html';
  writeFileSync(resolve(OUT, outName), pageHtml(title, html), 'utf8');
  console.log('generated', outName);
}
```

- [ ] **Step 6: サンプルmdを作成** — `lessons-md/01-variables.md`:
```md
# 変数を学ぼう（Markdown版）

変数は値の入れ物です。

```php run
echo "こんにちは";
```

## 練習：合計を出力しよう

```php exercise expected="15"
$a = 7;
$b = 8;
// ここに答えを書く
```
```

- [ ] **Step 7: 変換を実行して生成物を確認**

Run: `npm run build:md`
Expected: コンソールに `generated md-01-variables.html`。`lessons/md-01-variables.html` が生成され、手書きの `lessons/01-variables.html` は上書きされない（Step 5で `md-` 前置済み）。

- [ ] **Step 8: 生成HTMLが目次から開けるよう追記** — `lessons/index.html` の `<ul>` に1行追加:
```html
    <li><a href="./md-01-variables.html">（参考）Markdownから生成</a></li>
```

- [ ] **Step 9: ビルド全体が通ることを確認**

Run: `npm run build`
Expected: `dist/` に `md-01-variables.html` も含めてエラーなく生成。

- [ ] **Step 10: コミット**

```bash
git add build/md-transform.ts build/md-transform.test.ts build/md-to-html.ts lessons-md/01-variables.md lessons/index.html lessons/md-01-variables.html
git commit -m "feat: add Markdown->HTML lesson build (secondary authoring path)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: README（執筆・配布の手順）と最終確認

**Files:**
- Create: `README.md`

- [ ] **Step 1: READMEを作成** — `README.md`:
```md
# PHP埋め込み実行型 学習システム

HTMLに `<php-run>` / `<php-exercise>` を置くだけで、ブラウザ内（php-wasm）でPHPを実行・採点できる学習教材を作れます。

## セットアップ
\`\`\`bash
npm install
npx playwright install chromium   # E2Eを動かす場合
\`\`\`

## 開発（執筆中のプレビュー）
\`\`\`bash
npm run dev        # http://localhost:5173/lessons/index.html
\`\`\`

## レッスンの書き方（主：HTML）
\`lessons/\` に HTML を追加し、`<head>` で `/src/index.ts` を読み込みます。

- 表示ブロック: `<php-run><script type="text/php">echo "hi";</script></php-run>`
  - 1行=コンパクト（結果は下）、複数行=左右（左コード/右出力）。`layout="compact|split|stacked"` で上書き。
- 演習ブロック: `<php-exercise expected="15"><script type="text/php">...</script></php-exercise>`
  - `expected` を書くと採点ON（正解/不正解）。無ければ自由練習。
  - `solution="<?php ..."` で模範解答ボタン。`match="exact|contains"`。`id="..."` で保存キー固定。
- コードは必ず `<script type="text/php">` に入れる（`<` `&` のエスケープ不要）。

## レッスンの書き方（従：Markdown）
\`lessons-md/*.md\` に書き、\`\`\`php run / \`\`\`php exercise expected="..." のフェンスを使う。
\`\`\`bash
npm run build:md   # lessons/md-*.html を生成
\`\`\`

## 配布（v1＝リンク）
\`\`\`bash
npm run build      # dist/ に静的バンドル（wasm自己同梱・base相対）
\`\`\`
\`dist/\` を無料の静的ホスティング（GitHub Pages / Netlify / Cloudflare Pages 等）に公開し、URLを学習者に共有する。受け取る人はクリックするだけで実行できる。

## テスト
\`\`\`bash
npm test           # 単体（Vitest/jsdom）
npm run e2e        # 実ブラウザ（Playwright、php-wasm実行）
\`\`\`

## 注意（v1の制限）
- PHPはブラウザ内（php-wasm）で動きます。実MySQLやサーバー固有機能は対象外です。
- v1はメインスレッド実行のため**無限ループを強制停止できません**。教材コードに無限ループを含めないでください（将来Worker版で対応予定）。

## 将来拡張
オフラインZIP配布、XAMPP/MAMP（本物PHP）対応、WYSIWYG編集。詳細は \`docs/superpowers/specs/2026-06-02-php-embed-learning-system-design.md\`。
```

- [ ] **Step 2: 全テスト・ビルド・E2Eの通し確認**

Run: `npm test && npm run build && npm run e2e`
Expected: 単体PASS、`dist/` 生成、E2E 2件PASS。

- [ ] **Step 3: 受け入れ条件の手動チェック**

`npm run preview` 後、ブラウザで確認:
- [ ] `01-variables.html`: `<php-run>` が「こんにちは」を表示、複数行が左右。
- [ ] 演習: スターター表示→`echo $a+$b;`等で実行→出力15→「正解」。誤答で「不正解」。
- [ ] ↺で初期化、👁で模範解答が入る。
- [ ] エディタ編集後リロードで内容が復元。
- [ ] `02-arrays.html` の採点なし演習が自由に実行できる。

- [ ] **Step 4: コミット**

```bash
git add README.md
git commit -m "docs: add README with authoring and link-distribution guide

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 完了の定義（設計書 §14 と対応）

1. HTMLレッスンに部品＋ランタイムを置きブラウザで動く → Task 9,10,12
2. `<php-run>` 1行=コンパクト/複数行=左右 → Task 4,6,9
3. `<php-exercise>` スターター＋実行＋出力/エラー → Task 8,9
4. `expected` で正解/不正解、未指定で採点なし → Task 3,8
5. ↺リセット・👁模範解答 → Task 8
6. localStorageで復元 → Task 5,8
7. 静的ホスティングでURLだけで動く（wasm自己同梱・base相対） → Task 1,9,12
8. サンプル3本以上＋採点あり/なし → Task 9,10
9. Markdown1本が変換で動く → Task 11

## 既知の制限と将来対応（設計書 §8・§13 関連）

- **実行タイムアウト（無限ループ対策）**: php-wasmをメインスレッドで動かすv1では、同期実行中のwasmを途中で強制中断できない。`Executor.run` の `opts.timeoutMs` は将来用に予約のみ。**ハードなタイムアウトはWeb Worker版Executor（将来）で実装**する（インターフェースは同一のため差し替え可能）。v1ではサンプル教材に無限ループを含めない運用で回避し、READMEに注意を記載する。
- **状態の分離**: 演習の再実行時は `php.refresh()`（存在時）で初期化する。未提供の場合は関数再宣言エラー回避のためWorker版/インスタンス再生成を将来検討。
- **単一HTML `file://` ダブルクリック**: v1対象外（配布はリンク）。将来②で起動ツール同梱として検証。

---
```
