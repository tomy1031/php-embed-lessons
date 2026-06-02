# RPGカリキュラム 増分1（インフラ＋Phase A: A01〜A03）実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存 php-wasm 学習システムに、コース基盤（再帰探索・目次/前後ナビ・二部構成CSS・整合E2E）と、RPGで学ぶ Phase A の最初の3レッスン（A01変数/型・A02演算子と比較(==/===)・A03制御構文）を、完全執筆して追加・公開可能にする。

**Architecture:** レッスンは `lessons/<phase>/<id>.html` に置き、`<head>` で既存ランタイム `/src/index.ts` を読み込む。各レッスンは「①RPGで概念 → ②実システムで再演 → まとめ＆チェック → ナビ」の二部構成。前後ナビは `lessons/course.json`（順序）を読む `<course-nav>` Webコンポーネントが自動描画。採点演習は `expected`＋`solution` を必ず持ち、全演習の「solution実行→正解」をPlaywrightで自動検証する。

**Tech Stack:** 既存（TypeScript / Vite MPA / Vitest+jsdom / Playwright / Web Components / php-wasm / CodeMirror）。新規依存なし。

**前提:** ブランチ `feat/rpg-curriculum`。設計書 `docs/superpowers/specs/2026-06-02-rpg-php-curriculum-design.md`。既存デモ（`lessons/01-variables.html` 等）は移動しない（既存E2Eを壊さないため）。`lessons/index.html` はコース目次に作り替える。

**コミット規約:** すべてのコミットメッセージ末尾に `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

## ファイル構成（この増分で作る/触る）

```
vite.config.ts                         # 入力を lessons/**/*.html へ（再帰）
src/course/nav.ts                      # findNav 純粋関数（前後リンク算出）
src/course/nav.test.ts                 # findNav 単体テスト
src/components/course-nav.ts           # <course-nav> Webコンポーネント
src/styles/course.css                  # 二部構成・図版・コールアウト・ナビ
src/index.ts                           # course.css 読込＋course-nav 登録（修正）
lessons/course.json                    # レッスン順序とタイトル
lessons/index.html                     # コース目次（作り替え）
lessons/phase-a/a01-variables.html     # A01 変数とデータ型
lessons/phase-a/a02-operators.html     # A02 演算子と比較(==/===)
lessons/phase-a/a03-control.html       # A03 制御構文
lessons/phase-a/a01-variables.images.md# A01 画像プロンプト
lessons/phase-a/a02-operators.images.md
lessons/phase-a/a03-control.images.md
tests/e2e/course-integrity.spec.ts     # 全採点演習 solution→正解 を検証
```

---

## Task 1: レッスンの再帰探索（Vite MPA入力）

**Files:** Modify `vite.config.ts`

- [ ] **Step 1: vite.config.ts を再帰探索に変更**

`readdirSync(lessonsDir)`（トップレベルのみ）を、サブフォルダも拾う再帰版へ置き換える。`vite.config.ts` 全文を次にする：
```ts
import { defineConfig } from 'vite';
import { readdirSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = __dirname;
const lessonsDir = resolve(root, 'lessons');

// lessons/ 配下の *.html を再帰的に収集し、相対パスをキーにする
const input: Record<string, string> = {};
for (const entry of readdirSync(lessonsDir, { recursive: true }) as string[]) {
  if (typeof entry === 'string' && entry.endsWith('.html')) {
    const abs = resolve(lessonsDir, entry);
    const key = relative(root, abs).replace(/\\/g, '/').replace(/\.html$/, '');
    input[key] = abs;
  }
}

export default defineConfig({
  base: './',
  resolve: { alias: { '@': resolve(root, 'src') } },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: { exclude: ['php-wasm'] },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input } },
  plugins: [
    {
      // course.json は fetch でのみ参照される静的データ。ビルド出力にコピーする。
      name: 'copy-lesson-data',
      closeBundle() {
        const src = resolve(root, 'lessons/course.json');
        if (existsSync(src)) {
          mkdirSync(resolve(root, 'dist/lessons'), { recursive: true });
          copyFileSync(src, resolve(root, 'dist/lessons/course.json'));
        }
      },
    },
  ],
});
```

- [ ] **Step 2: 仮の入れ子レッスンでビルドが拾うことを確認**

一時ファイルを作って確認する：
Run: `mkdir -p lessons/phase-a && printf '<!doctype html><meta charset=utf-8><title>tmp</title><p>tmp</p>' > lessons/phase-a/_tmp.html && npm run build 2>&1 | tail -5 && ls dist/lessons/phase-a/`
Expected: `dist/lessons/phase-a/_tmp.html` が生成される。

- [ ] **Step 3: 一時ファイルを削除**

Run: `rm lessons/phase-a/_tmp.html`
Expected: 削除される。

- [ ] **Step 4: 既存ユニットテストが緑のままか確認**

Run: `npm test 2>&1 | tail -4`
Expected: 31 passed（vite変更はテストに無関係）。

- [ ] **Step 5: コミット**
```bash
git add vite.config.ts
git commit -m "feat: recursive lesson discovery for course subfolders

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: コースナビ（findNav 純粋関数 ＋ `<course-nav>`）

**Files:** Create `src/course/nav.ts`, `src/course/nav.test.ts`, `src/components/course-nav.ts`; Modify `src/index.ts`

- [ ] **Step 1: 失敗するテストを書く** — `src/course/nav.test.ts`
```ts
import { findNav, type Lesson } from './nav';

const lessons: Lesson[] = [
  { path: 'phase-a/a01-variables.html', title: 'A01 変数とデータ型' },
  { path: 'phase-a/a02-operators.html', title: 'A02 演算子と比較' },
  { path: 'phase-a/a03-control.html', title: 'A03 制御構文' },
];

describe('findNav', () => {
  it('中間は前後を返す', () => {
    const nav = findNav(lessons, '/lessons/phase-a/a02-operators.html');
    expect(nav.prev?.path).toBe('phase-a/a01-variables.html');
    expect(nav.next?.path).toBe('phase-a/a03-control.html');
    expect(nav.current?.title).toBe('A02 演算子と比較');
  });
  it('先頭はprevがnull', () => {
    expect(findNav(lessons, '/lessons/phase-a/a01-variables.html').prev).toBeNull();
  });
  it('末尾はnextがnull', () => {
    expect(findNav(lessons, '/lessons/phase-a/a03-control.html').next).toBeNull();
  });
  it('未知パスは全てnull', () => {
    const nav = findNav(lessons, '/lessons/unknown.html');
    expect(nav.current).toBeNull();
    expect(nav.prev).toBeNull();
    expect(nav.next).toBeNull();
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npm test -- src/course/nav.test.ts`
Expected: FAIL（`nav` 未作成）。

- [ ] **Step 3: 実装** — `src/course/nav.ts`
```ts
export interface Lesson { path: string; title: string; }
export interface Nav { prev: Lesson | null; next: Lesson | null; current: Lesson | null; }

export function findNav(lessons: Lesson[], currentPath: string): Nav {
  const idx = lessons.findIndex((l) => currentPath.endsWith(l.path));
  if (idx === -1) return { prev: null, next: null, current: null };
  return {
    prev: idx > 0 ? lessons[idx - 1] : null,
    next: idx < lessons.length - 1 ? lessons[idx + 1] : null,
    current: lessons[idx],
  };
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npm test -- src/course/nav.test.ts`
Expected: PASS（4件）。

- [ ] **Step 5: `<course-nav>` を実装** — `src/components/course-nav.ts`
```ts
import { findNav, type Lesson } from '@/course/nav';

export class CourseNav extends HTMLElement {
  async connectedCallback(): Promise<void> {
    const manifestAttr = this.getAttribute('manifest') ?? 'course.json';
    const manifestUrl = new URL(manifestAttr, location.href);
    let lessons: Lesson[] = [];
    try {
      const res = await fetch(manifestUrl.href);
      lessons = ((await res.json()).lessons as Lesson[]) ?? [];
    } catch {
      /* manifest が無くてもページは壊さない */
    }
    const nav = findNav(lessons, location.pathname);
    const link = (l: Lesson | null, label: string) =>
      l ? `<a href="${new URL(l.path, manifestUrl).href}">${label} ${l.title}</a>` : '<span></span>';
    this.innerHTML =
      `<nav class="course-nav">${link(nav.prev, '← 前')}` +
      `<a class="toc" href="${new URL('index.html', manifestUrl).href}">目次</a>` +
      `${link(nav.next, '次 →')}</nav>`;
  }
}
```

- [ ] **Step 6: index.ts に登録（course.css 読込はTask 3で追加）** — `src/index.ts` を次に更新
```ts
import { configure } from './runtime/config';
import { WasmExecutor } from './executor/wasm-executor';
import { codeMirrorFactory } from './editor/codemirror';
import { PhpRun } from './components/php-run';
import { PhpExercise } from './components/php-exercise';
import { CourseNav } from './components/course-nav';
import './styles/lesson.css';

configure({ executor: new WasmExecutor(), editorFactory: codeMirrorFactory });

if (!customElements.get('php-run')) customElements.define('php-run', PhpRun);
if (!customElements.get('php-exercise')) customElements.define('php-exercise', PhpExercise);
if (!customElements.get('course-nav')) customElements.define('course-nav', CourseNav);

export { configure };
```
> 注: `course.css` の import は Task 3（CSS作成と同時）で追加する。ここではまだ追加しない（存在しないファイルを import するコミットを避けるため）。

- [ ] **Step 7: コミット**
```bash
git add src/course/nav.ts src/course/nav.test.ts src/components/course-nav.ts src/index.ts
git commit -m "feat: add course nav (findNav + <course-nav>) and register it

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: コース用CSS

**Files:** Create `src/styles/course.css`

- [ ] **Step 1: 作成** — `src/styles/course.css`
```css
.lesson { max-width: 760px; margin: 0 auto; padding: 1.5rem 1.2rem 3rem;
  font-family: system-ui, -apple-system, "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
  line-height: 1.75; color: #1f2430; }
.lesson h1 { font-size: 1.6rem; }
.lesson h2 { margin-top: 2rem; padding-bottom: .2rem; border-bottom: 2px solid #e0e4ec; }
.lesson .goals { background: #f1f5ff; border: 1px solid #d6e0ff; border-radius: 8px; padding: .8rem 1rem; }
.lesson figure { margin: 1rem 0; text-align: center; }
.lesson figure img { max-width: 100%; border-radius: 10px; border: 1px solid #e0e4ec; }
.lesson figcaption { font-size: .85rem; color: #8a94a6; }
.lesson .part { background: #fafbff; border: 1px solid #eef1f7; border-radius: 10px; padding: .2rem 1rem 1rem; margin: 1rem 0; }
.lesson .part.real { background: #fffaf3; border-color: #f4e7d4; }
.lesson .tag { display: inline-block; font-size: .75rem; font-weight: 700; color: #fff;
  background: #2563eb; border-radius: 999px; padding: .1rem .7rem; margin: .8rem 0 .2rem; }
.lesson .part.real .tag { background: #c2761b; }
.lesson .callout { background: #fff7f7; border-left: 4px solid #f38ba8; padding: .6rem .9rem; border-radius: 4px; }
nav.course-nav { display: flex; justify-content: space-between; gap: .5rem; margin-top: 2.5rem;
  padding-top: 1rem; border-top: 1px solid #e0e4ec; font-size: .95rem; }
nav.course-nav a { text-decoration: none; color: #2563eb; }
nav.course-nav a.toc { color: #8a94a6; }
```

- [ ] **Step 2: index.ts に course.css の import を追加**

`src/index.ts` の `import './styles/lesson.css';` の直後に次の1行を追加する：
```ts
import './styles/course.css';
```

- [ ] **Step 3: ビルドが通ることを確認（course.css import 解決）**

Run: `npm run build 2>&1 | tail -4`
Expected: エラーなく完了（`./styles/course.css` が解決される）。

- [ ] **Step 4: ユニットテスト緑を確認**

Run: `npm test 2>&1 | tail -4`
Expected: 35 passed（既存31＋findNav4）。

- [ ] **Step 5: コミット**
```bash
git add src/styles/course.css src/index.ts
git commit -m "feat: add course CSS (two-part lesson layout, callouts, nav)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: レッスン A01「変数とデータ型」

**Files:** Create `lessons/phase-a/a01-variables.html`, `lessons/phase-a/a01-variables.images.md`

- [ ] **Step 1: レッスンHTMLを作成** — `lessons/phase-a/a01-variables.html`
```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A01 変数とデータ型 | RPGで学ぶPHP</title>
  <script type="module" src="/src/index.ts"></script>
</head>
<body>
  <article class="lesson">
    <h1>A01 変数とデータ型</h1>
    <figure>
      <img src="../assets/img/a01/a01-status.png" alt="勇者のステータス画面（名前・レベル・HP・MP）" />
      <figcaption>勇者のステータスは「変数」でできている</figcaption>
    </figure>
    <div class="goals">
      <b>このレッスンのねらい</b>
      <ul>
        <li>変数は「値の入れ物」だと分かる</li>
        <li><code>$名前 = 値;</code> で作れる</li>
        <li>int / float / string / bool / null の型を知る</li>
      </ul>
    </div>

    <div class="part">
      <span class="tag">① RPGで概念</span>
      <p>勇者のHPや名前は、ひとつずつ「変数」に入れて持ちます。<code>$</code> で始めるのがPHPの変数です。</p>
      <php-run><script type="text/php">
$name  = "勇者アレン";
$level = 5;
$hp    = 120;
$mp    = 30;
echo "{$name} (Lv{$level}) HP:{$hp} MP:{$mp}";
      </script></php-run>

      <p>値の種類を「型」と呼びます。PHPは自動で型を決めます。</p>
      <php-run><script type="text/php">
echo gettype(100), "\n";   // 整数
echo gettype(1.5), "\n";   // 小数
echo gettype("アレン"), "\n"; // 文字列
echo gettype(true), "\n";  // 真偽値
      </script></php-run>

      <p><b>練習：</b>モンスターのHPを表す変数 <code>$monster_hp</code> を作り、80 を入れて出力しよう。</p>
      <php-exercise expected="80" solution='<?php
$monster_hp = 80;
echo $monster_hp;'>
        <script type="text/php">
// $monster_hp に 80 を入れて出力しよう
        </script>
      </php-exercise>
    </div>

    <div class="part real">
      <span class="tag">② 実システムでは</span>
      <p>同じ仕組みを、実際のWebシステムでも使います。たとえば商品の情報を変数に入れます。</p>
      <php-run><script type="text/php">
$productName = "PHP入門書";
$price = 2980;
$stock = 12;
echo "{$productName}: {$price}円 (在庫{$stock})";
      </script></php-run>

      <p><b>練習：</b>本体価格 <code>$price = 1000</code> の税込価格（税率10%）を出力しよう（ヒント: <code>$price * 1.1</code>）。</p>
      <php-exercise expected="1100" solution='<?php
$price = 1000;
echo $price * 1.1;'>
        <script type="text/php">
$price = 1000;
// 税込価格（10%）を計算して出力しよう
        </script>
      </php-exercise>
    </div>

    <h2>まとめ＆チェック</h2>
    <ul>
      <li>変数は <code>$名前 = 値;</code> で作る入れ物</li>
      <li>型は int / float / string / bool / null（自動で決まる）</li>
      <li>文字列の中に <code>{$変数}</code> で埋め込める</li>
    </ul>
    <p><b>チェック：</b>現在の経験値 <code>$exp = 250</code>、次のレベルに必要な <code>$next = 1000</code>。あと何ポイントで次のレベルかを出力しよう。</p>
    <php-exercise expected="750" solution='<?php
$exp = 250;
$next = 1000;
echo $next - $exp;'>
      <script type="text/php">
$exp = 250;
$next = 1000;
// あと何ポイントで次のレベル？を出力しよう
      </script>
    </php-exercise>

    <course-nav manifest="../course.json"></course-nav>
  </article>
</body>
</html>
```

- [ ] **Step 2: 画像プロンプトmanifestを作成** — `lessons/phase-a/a01-variables.images.md`
```md
# A01 画像プロンプト

共通スタイル接頭辞: 「やわらかい2Dゲームアート、明るい配色、フラットで親しみやすい、テキスト無し、余白広め」

## a01-status.png
- 用途: 導入の図（変数＝ステータス）
- alt: 勇者のステータス画面（名前・レベル・HP・MP）
- プロンプト: 上記スタイル + 「RPGの勇者のステータスウィンドウ。名前・レベル・HPバー・MPバーの枠が並ぶ。アイコン的でクリーン」
```

- [ ] **Step 3: プレースホルダ画像を作成（Viteは未存在の<img>でビルド失敗するため）**

Run: `mkdir -p lessons/assets/img/a01 && printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC' | openssl base64 -d -A > lessons/assets/img/a01/a01-status.png && ls -l lessons/assets/img/a01/a01-status.png`
Expected: 1x1のPNGが作成される（後で `chatgpt-batch-image-gen` の生成画像で同名上書き）。

- [ ] **Step 4: ビルド確認**

Run: `npm run build 2>&1 | tail -3 && ls dist/lessons/phase-a/`
Expected: `a01-variables.html` が出力され、ビルドが画像参照を解決できる。

- [ ] **Step 5: コミット**
```bash
git add lessons/phase-a/a01-variables.html lessons/phase-a/a01-variables.images.md lessons/assets/img/a01/a01-status.png
git commit -m "content: add lesson A01 variables and data types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: レッスン A02「演算子と比較（==/===）」

**Files:** Create `lessons/phase-a/a02-operators.html`, `lessons/phase-a/a02-operators.images.md`

- [ ] **Step 1: レッスンHTMLを作成** — `lessons/phase-a/a02-operators.html`
```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A02 演算子と比較（==/===） | RPGで学ぶPHP</title>
  <script type="module" src="/src/index.ts"></script>
</head>
<body>
  <article class="lesson">
    <h1>A02 演算子と比較（==/===）</h1>
    <figure>
      <img src="../assets/img/a02/a02-battle.png" alt="戦闘でダメージを計算する場面" />
      <figcaption>ダメージ計算と判定で「演算子」を使う</figcaption>
    </figure>
    <div class="goals">
      <b>このレッスンのねらい</b>
      <ul>
        <li>四則演算と比較で判定ができる</li>
        <li><code>==</code>（値だけ）と <code>===</code>（型も一致）の違いが分かる</li>
        <li>三項演算子 <code>?:</code> と null合体 <code>??</code> を使える</li>
      </ul>
    </div>

    <div class="part">
      <span class="tag">① RPGで概念</span>
      <p>攻撃力から防御力を引いてダメージを出します。</p>
      <php-run><script type="text/php">
$attack = 45;
$defense = 12;
echo "ダメージ: ", $attack - $defense;
      </script></php-run>

      <p>ここが最重要。<code>==</code> は「値だけ」、<code>===</code> は「型も一致」を見ます。</p>
      <php-run><script type="text/php">
echo (5 == "5")  ? "==: 同じ"  : "==: 違う", "\n";   // 値だけ見る → 同じ
echo (5 === "5") ? "===: 同じ" : "===: 違う", "\n";  // 型も見る → 違う
      </script></php-run>

      <p>判定の便利な書き方も覚えましょう。</p>
      <php-run><script type="text/php">
$hp = 0;
echo ($hp <= 0) ? "戦闘不能" : "戦える", "\n";  // 三項演算子
$nickname = null;
echo $nickname ?? "名無しの戦士", "\n";          // null合体
      </script></php-run>

      <p><b>練習：</b>サイコロの目 <code>$roll = 100</code> が「ちょうど100（型も一致）」なら「クリティカル！」、違えば「通常」を出力しよう。</p>
      <php-exercise expected="クリティカル！" solution='<?php
$roll = 100;
echo ($roll === 100) ? "クリティカル！" : "通常";'>
        <script type="text/php">
$roll = 100;
// $roll が === で 100 なら「クリティカル！」、違えば「通常」
        </script>
      </php-exercise>
    </div>

    <div class="part real">
      <span class="tag">② 実システムでは</span>
      <p>フォームから来る値は「文字列」です。<code>==</code> は思わぬ落とし穴になり、<code>===</code> が安全です。</p>
      <php-run><script type="text/php">
$input = "0";  // フォームから来た文字列の "0"
echo ($input == false) ? "空っぽ扱い" : "値あり", "\n"; // == の罠: "0" は false 扱い
echo ($input === "")   ? "空" : "入力あり", "\n";        // === なら厳密
      </script></php-run>

      <p><b>練習：</b>在庫 <code>$stock = 0</code> が「ちょうど0（型も一致）」なら「在庫なし」、それ以外は「在庫あり」を出力しよう。</p>
      <php-exercise expected="在庫なし" solution='<?php
$stock = 0;
echo ($stock === 0) ? "在庫なし" : "在庫あり";'>
        <script type="text/php">
$stock = 0;
// === を使って「在庫なし」/「在庫あり」を出力
        </script>
      </php-exercise>
    </div>

    <h2>まとめ＆チェック</h2>
    <ul>
      <li><code>==</code> は値だけ、<code>===</code> は型も一致（基本は <code>===</code> を使う）</li>
      <li><code>?:</code> で短い条件分岐、<code>??</code> で「無ければこれ」</li>
    </ul>
    <p class="callout">迷ったら <code>===</code>。<code>==</code> は <code>"0"</code> や <code>""</code> で予想外の結果になりがち。</p>
    <p><b>チェック：</b>単価 <code>$price = 1000</code>、個数 <code>$qty = 3</code>。合計を出し、合計が 2000 以上なら 10% 引きした金額を出力しよう。</p>
    <php-exercise expected="2700" solution='<?php
$price = 1000;
$qty = 3;
$total = $price * $qty;
echo ($total >= 2000) ? $total * 0.9 : $total;'>
      <script type="text/php">
$price = 1000;
$qty = 3;
// 合計を出し、2000以上なら10%引きして出力
      </script>
    </php-exercise>

    <course-nav manifest="../course.json"></course-nav>
  </article>
</body>
</html>
```

- [ ] **Step 2: 画像manifestを作成** — `lessons/phase-a/a02-operators.images.md`
```md
# A02 画像プロンプト

共通スタイル接頭辞: 「やわらかい2Dゲームアート、明るい配色、フラットで親しみやすい、テキスト無し、余白広め」

## a02-battle.png
- 用途: 導入の図（戦闘でダメージ計算）
- alt: 戦闘でダメージを計算する場面
- プロンプト: 上記スタイル + 「RPGの戦闘シーン。勇者がスライムに攻撃し、ダメージ数値がポップしている、コミカルで明るい」
```

- [ ] **Step 3: プレースホルダ画像を作成**

Run: `mkdir -p lessons/assets/img/a02 && printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC' | openssl base64 -d -A > lessons/assets/img/a02/a02-battle.png && ls -l lessons/assets/img/a02/a02-battle.png`
Expected: 1x1のPNGが作成される（後で生成画像で同名上書き）。

- [ ] **Step 4: ビルド確認**

Run: `npm run build 2>&1 | tail -3 && ls dist/lessons/phase-a/`
Expected: `a02-operators.html` が出力される。

- [ ] **Step 5: コミット**
```bash
git add lessons/phase-a/a02-operators.html lessons/phase-a/a02-operators.images.md lessons/assets/img/a02/a02-battle.png
git commit -m "content: add lesson A02 operators and comparison (==/===)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: レッスン A03「制御構文」

**Files:** Create `lessons/phase-a/a03-control.html`, `lessons/phase-a/a03-control.images.md`

- [ ] **Step 1: レッスンHTMLを作成** — `lessons/phase-a/a03-control.html`
```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A03 制御構文 | RPGで学ぶPHP</title>
  <script type="module" src="/src/index.ts"></script>
</head>
<body>
  <article class="lesson">
    <h1>A03 制御構文</h1>
    <figure>
      <img src="../assets/img/a03/a03-menu.png" alt="戦闘コマンドのメニュー画面" />
      <figcaption>「もし〜なら」「繰り返す」で物語が動く</figcaption>
    </figure>
    <div class="goals">
      <b>このレッスンのねらい</b>
      <ul>
        <li><code>if</code>/<code>elseif</code>/<code>switch</code> で分岐できる</li>
        <li><code>for</code>/<code>while</code>/<code>foreach</code> で繰り返せる</li>
        <li>条件と繰り返しを組み合わせられる</li>
      </ul>
    </div>

    <div class="part">
      <span class="tag">① RPGで概念</span>
      <p>選んだコマンドで処理を分けます。<code>switch</code> が便利です。</p>
      <php-run><script type="text/php">
$command = "attack";
switch ($command) {
  case "attack": echo "斬りかかった！"; break;
  case "magic":  echo "呪文を唱えた！"; break;
  default:       echo "様子を見た";
}
      </script></php-run>

      <p>敵の数だけ繰り返すなら <code>foreach</code>。</p>
      <php-run><script type="text/php">
$enemies = ["スライム", "ゴブリン", "ドラゴン"];
foreach ($enemies as $e) {
  echo "{$e} が現れた！\n";
}
      </script></php-run>

      <p>回数が決まっているなら <code>for</code>。</p>
      <php-run><script type="text/php">
for ($turn = 1; $turn <= 3; $turn++) {
  echo "ターン{$turn}\n";
}
      </script></php-run>

      <p><b>練習：</b>HP <code>$hp = 20</code>。0以下なら「戦闘不能」、30未満なら「ピンチ！」、それ以外は「元気」を出力しよう。</p>
      <php-exercise expected="ピンチ！" solution='<?php
$hp = 20;
if ($hp <= 0) {
  echo "戦闘不能";
} elseif ($hp < 30) {
  echo "ピンチ！";
} else {
  echo "元気";
}'>
        <script type="text/php">
$hp = 20;
// if / elseif / else で状態を出力しよう
        </script>
      </php-exercise>
    </div>

    <div class="part real">
      <span class="tag">② 実システムでは</span>
      <p>注文ステータスの表示分岐や、一覧の繰り返し表示に使います。</p>
      <php-run><script type="text/php">
$status = "shipped";
switch ($status) {
  case "pending": echo "支払い待ち"; break;
  case "shipped": echo "発送済み"; break;
  case "done":    echo "完了"; break;
}
      </script></php-run>

      <p><b>練習：</b>カートの価格一覧 <code>[500, 800, 1200]</code> を <code>foreach</code> で合計して出力しよう。</p>
      <php-exercise expected="2500" solution='<?php
$prices = [500, 800, 1200];
$total = 0;
foreach ($prices as $p) {
  $total += $p;
}
echo $total;'>
        <script type="text/php">
$prices = [500, 800, 1200];
$total = 0;
// foreach で合計して出力しよう
        </script>
      </php-exercise>
    </div>

    <h2>まとめ＆チェック</h2>
    <ul>
      <li>分岐：<code>if/elseif/else</code>、多分岐は <code>switch</code></li>
      <li>繰り返し：回数なら <code>for</code>、要素ごとなら <code>foreach</code></li>
    </ul>
    <p><b>チェック：</b><code>for</code> を使って 1 から 5 までを連結して出力しよう（例: <code>12345</code>）。</p>
    <php-exercise expected="12345" solution='<?php
for ($i = 1; $i <= 5; $i++) {
  echo $i;
}'>
      <script type="text/php">
// for で 1〜5 を連結して出力しよう
      </script>
    </php-exercise>

    <course-nav manifest="../course.json"></course-nav>
  </article>
</body>
</html>
```

- [ ] **Step 2: 画像manifestを作成** — `lessons/phase-a/a03-control.images.md`
```md
# A03 画像プロンプト

共通スタイル接頭辞: 「やわらかい2Dゲームアート、明るい配色、フラットで親しみやすい、テキスト無し、余白広め」

## a03-menu.png
- 用途: 導入の図（分岐＝コマンド選択）
- alt: 戦闘コマンドのメニュー画面
- プロンプト: 上記スタイル + 「RPGの戦闘コマンドメニュー（たたかう・まほう・どうぐ・にげる の枠）、矢印カーソル付き、クリーンなUI」
```

- [ ] **Step 3: プレースホルダ画像を作成**

Run: `mkdir -p lessons/assets/img/a03 && printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC' | openssl base64 -d -A > lessons/assets/img/a03/a03-menu.png && ls -l lessons/assets/img/a03/a03-menu.png`
Expected: 1x1のPNGが作成される（後で生成画像で同名上書き）。

- [ ] **Step 4: ビルド確認**

Run: `npm run build 2>&1 | tail -3 && ls dist/lessons/phase-a/`
Expected: `a03-control.html` が出力される。

- [ ] **Step 5: コミット**
```bash
git add lessons/phase-a/a03-control.html lessons/phase-a/a03-control.images.md lessons/assets/img/a03/a03-menu.png
git commit -m "content: add lesson A03 control structures

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: コース目次（course.json ＋ index 作り替え）

**Files:** Create `lessons/course.json`; Modify `lessons/index.html`

- [ ] **Step 1: course.json を作成** — `lessons/course.json`
```json
{
  "lessons": [
    { "path": "phase-a/a01-variables.html", "title": "A01 変数とデータ型" },
    { "path": "phase-a/a02-operators.html", "title": "A02 演算子と比較" },
    { "path": "phase-a/a03-control.html",   "title": "A03 制御構文" }
  ]
}
```

- [ ] **Step 2: index.html をコース目次に作り替え** — `lessons/index.html` 全文
```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RPGで学ぶ フルスタックPHP</title>
  <style>
    body { font-family: system-ui, -apple-system, "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
      max-width: 760px; margin: 0 auto; padding: 2rem 1.2rem; line-height: 1.75; color: #1f2430; }
    h1 { margin-bottom: .2rem; }
    .lead { color: #51607a; margin-top: 0; }
    h2 { margin-top: 1.8rem; }
    ul.lessons { list-style: none; padding: 0; }
    ul.lessons li { margin: .5rem 0; }
    ul.lessons a { display: block; text-decoration: none; color: #1f2430;
      border: 1px solid #e0e4ec; border-radius: 8px; padding: .7rem 1rem; }
    ul.lessons a:hover { border-color: #2563eb; background: #f7faff; }
    .num { color: #2563eb; font-weight: 700; margin-right: .5rem; }
    .demo a { color: #51607a; }
    footer { margin-top: 2rem; font-size: .85rem; color: #8a94a6; }
  </style>
</head>
<body>
  <h1>RPGで学ぶ フルスタックPHP</h1>
  <p class="lead">勇者になった気分で、ブラウザの中だけでPHPを動かしながら学べます。インストール不要。</p>

  <h2>Phase A：RPGで基礎をつかむ</h2>
  <ul class="lessons">
    <li><a href="./phase-a/a01-variables.html"><span class="num">A01</span>変数とデータ型</a></li>
    <li><a href="./phase-a/a02-operators.html"><span class="num">A02</span>演算子と比較（==/===）</a></li>
    <li><a href="./phase-a/a03-control.html"><span class="num">A03</span>制御構文</a></li>
  </ul>

  <h2 class="demo">参考：初期デモ</h2>
  <ul class="lessons demo">
    <li><a href="./01-variables.html">デモ: 変数</a></li>
    <li><a href="./02-arrays.html">デモ: 配列</a></li>
    <li><a href="./03-functions.html">デモ: 関数</a></li>
  </ul>

  <footer>RPGで学ぶ フルスタックPHP — php-wasm で動作</footer>
</body>
</html>
```

- [ ] **Step 3: ビルド確認（course.json が dist にコピーされる）**

Run: `npm run build 2>&1 | tail -3 && ls dist/lessons/course.json dist/lessons/index.html`
Expected: エラーなし。`dist/lessons/course.json`（Task 1 で追加した copy-lesson-data プラグインがコピー）と `dist/lessons/index.html` が存在する。dev/preview では `<course-nav>` が `../course.json` を fetch できる。

- [ ] **Step 4: コミット**
```bash
git add lessons/course.json lessons/index.html
git commit -m "feat: course manifest and TOC index for Phase A

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: コース整合E2E ＋ 通し確認

**Files:** Create `tests/e2e/course-integrity.spec.ts`

- [ ] **Step 1: 整合E2Eを作成** — `tests/e2e/course-integrity.spec.ts`
```ts
import { test, expect } from '@playwright/test';

// Phase A の各レッスンで、expected を持つ全演習が solution 実行で「正解」になることを検証
const pages = [
  '/lessons/phase-a/a01-variables.html',
  '/lessons/phase-a/a02-operators.html',
  '/lessons/phase-a/a03-control.html',
];

for (const p of pages) {
  test(`整合: ${p} の採点演習は solution で正解になる`, async ({ page }) => {
    await page.goto(p);
    const exs = page.locator('php-exercise[expected]');
    const n = await exs.count();
    expect(n).toBeGreaterThan(0); // 採点演習が必ずある
    for (let i = 0; i < n; i++) {
      const ex = exs.nth(i);
      await ex.locator('button.solution').click(); // 模範解答を入れる
      await ex.locator('button.run').click();       // 実行
      await expect(ex.locator('.result')).toContainText('正解', { timeout: 60_000 });
    }
  });
}
```

- [ ] **Step 2: E2Eを実行（既存＋新規）**

Run: `npm run e2e 2>&1 | tail -20`
Expected: 既存8 ＋ 新規3（A01/A02/A03の整合）＝ 11 passed。
失敗時の調査：失敗したレッスンの該当演習の `solution` を php-wasm 実行した結果が `expected` と一致するか（正規化後の文字列一致）を確認し、`expected` または `solution` を修正する。`button.solution` が無い（=expected付きなのにsolution未設定）レッスンは方針違反なので solution を追加する。

- [ ] **Step 3: 全ゲートを通す**

Run: `npm test 2>&1 | tail -4 && npx tsc --noEmit && npm run build 2>&1 | tail -3`
Expected: ユニット35 passed、tsc エラー0、build 成功。

- [ ] **Step 4: コミット**
```bash
git add tests/e2e/course-integrity.spec.ts
git commit -m "test: add course-integrity e2e (all graded solutions pass)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 完了の定義（増分1）

1. `lessons/**` を再帰探索してビルドできる（サブフォルダ対応）→ Task 1
2. `<course-nav>` が course.json から前後＋目次リンクを描画（findNav は単体テスト済み）→ Task 2,3,7
3. 二部構成レッスン A01/A02/A03 が公開でき、各演習が動作・採点される → Task 4,5,6
4. 各採点演習は `expected`＋`solution` を持ち、solution 実行で「正解」になる（整合E2Eで自動検証）→ Task 8
5. コース目次 `lessons/index.html` から Phase A レッスンへ辿れる → Task 7
6. 画像は各レッスンの `.images.md` にプロンプト定義（生成は別工程、未生成でもaltで成立）→ Task 4,5,6
7. ユニット35 / tsc0 / build成功 / E2E11 がすべて緑 → Task 8

## この増分の後（次プラン）
- 増分2: Phase A の A04〜A11（配列・関数・文字列・連想配列・クラス・継承・カプセル化/static/enum・例外）
- 増分3: Phase B（擬似リクエスト注入＋B01〜B10）
- 増分4: Phase C（C01〜C08）
- 画像生成: `chatgpt-batch-image-gen` で各 `.images.md` のプロンプトから生成し `lessons/assets/img/<lesson>/` に配置
```
