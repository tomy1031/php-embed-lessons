# A01 没入リデザイン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A01を会話・ポイント・図解中心の没入型に刷新し、実行UI（縦積み・ボタン位置・空エリア）を全コンポーネントで統一する。

**Architecture:** 新Web Components（`<char-talk>` `<point-box>`）を追加し、`php-run`/`php-exercise` を縦積み＋実行後出力に変更。A01本文を普通の日本語（漢字・余分な半角スペース全廃）で書き直し、配列予告を削除、値変え演習から段階化。キャラ／挿絵はGPT生成（md5重複チェック）、未生成でも崩れないプレースホルダを持つ。

**Tech Stack:** TypeScript, vanilla Custom Elements, Vite 5 (MPA, base './'), Vitest(jsdom), Playwright, CodeMirror 6, php-wasm。

参照スペック: `docs/superpowers/specs/2026-06-03-a01-immersive-redesign-design.md`

---

## File Structure
- Create: `src/components/point-box.ts` — `<point-box>`（タイトル＋番号付きポイント）
- Create: `src/components/point-box.test.ts`
- Create: `src/components/char-talk.ts` — `<char-talk>`（円形アイコン＋吹き出し会話）
- Create: `src/components/char-talk.test.ts`
- Modify: `src/index.ts` — 2コンポーネント登録
- Modify: `src/components/php-run.ts` — 出力を実行後表示（空箱撤去）
- Modify: `src/components/php-run.test.ts` — 実行前は output hidden を確認
- Modify: `src/styles/lesson.css` — 縦積み統一、エディタmin-height、point-box/char-talk 基本スタイル、split撤去
- Modify: `src/styles/course.css` — body.rpg 用 point-box/char-talk テーマ
- Modify: `lessons/phase-a/a01-variables.html` — 本文全面書き換え
- Modify: `tests/e2e/lesson.spec.ts` — 既存のphp-run押下フロー（変更不要なら確認のみ）
- Assets: `lessons/assets/img/a01/char/{mira,allen,slime}.png`, 追加シーン挿絵（任意）

---

### Task 1: `<point-box>` コンポーネント

**Files:**
- Create: `src/components/point-box.ts`
- Test: `src/components/point-box.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { PointBox } from './point-box';

beforeAll(() => {
  if (!customElements.get('point-box')) customElements.define('point-box', PointBox);
});

function mount(html: string, attrs: Record<string, string> = {}): PointBox {
  const el = document.createElement('point-box') as PointBox;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('<point-box>', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('title既定は「ここがポイント」、li件数を保つ', () => {
    const el = mount('<li>あ</li><li>い</li><li>う</li>');
    expect(el.querySelector('.point-title')!.textContent).toBe('ここがポイント');
    expect(el.querySelectorAll('.point-list li').length).toBe(3);
  });

  it('title属性を反映、liのHTML(code)を保持', () => {
    const el = mount('<li><code>echo</code> を使う</li>', { title: 'コツ' });
    expect(el.querySelector('.point-title')!.textContent).toBe('コツ');
    expect(el.querySelector('.point-list li code')!.textContent).toBe('echo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/point-box.test.ts`
Expected: FAIL（モジュール未作成）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/point-box.ts
export class PointBox extends HTMLElement {
  connectedCallback(): void {
    const title = this.getAttribute('title') ?? 'ここがポイント';
    const items = Array.from(this.querySelectorAll('li')).map((li) => li.innerHTML);
    this.classList.add('point-box');
    this.innerHTML =
      '<div class="point-head"><span class="point-ico">💡</span><span class="point-title"></span></div>' +
      '<ol class="point-list">' +
      items.map((h) => `<li>${h}</li>`).join('') +
      '</ol>';
    (this.querySelector('.point-title') as HTMLElement).textContent = title;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/point-box.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add src/components/point-box.ts src/components/point-box.test.ts
git commit -m "feat: point-box コンポーネント（ポイント表示）"
```

---

### Task 2: `<char-talk>` コンポーネント

**Files:**
- Create: `src/components/char-talk.ts`
- Test: `src/components/char-talk.test.ts`

設計: `speaker` で {名前, アクセント色} を引く内部テーブル（仲間追加はここに1行）。`avatar` 属性があれば円形画像、無ければ頭文字プレースホルダ。`side` で左右。本文(innerHTML)を吹き出しへ。

- [ ] **Step 1: Write the failing test**

```ts
import { CharTalk } from './char-talk';

beforeAll(() => {
  if (!customElements.get('char-talk')) customElements.define('char-talk', CharTalk);
});

function mount(body: string, attrs: Record<string, string> = {}): CharTalk {
  const el = document.createElement('char-talk') as CharTalk;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = body;
  document.body.appendChild(el);
  return el;
}

describe('<char-talk>', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('speakerで名前を引き、本文と左寄せを描画', () => {
    const el = mount('こんにちは', { speaker: 'mira' });
    expect(el.querySelector('.name')!.textContent).toBe('賢者ミラ');
    expect(el.querySelector('.say')!.textContent).toContain('こんにちは');
    expect(el.classList.contains('side-left')).toBe(true);
  });

  it('未知speakerは「？」にフォールバック', () => {
    const el = mount('x', { speaker: 'nobody' });
    expect(el.querySelector('.name')!.textContent).toBe('？');
  });

  it('side=rightで右寄せ、avatar無しはプレースホルダ', () => {
    const el = mount('y', { speaker: 'allen', side: 'right' });
    expect(el.classList.contains('side-right')).toBe(true);
    expect(el.querySelector('.avatar-ph')).toBeTruthy();
  });

  it('avatar属性があれば画像を出す', () => {
    const el = mount('z', { speaker: 'slime', avatar: '../x/slime.png' });
    const img = el.querySelector('img.avatar') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('../x/slime.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/char-talk.test.ts`
Expected: FAIL（モジュール未作成）

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/char-talk.ts
interface Speaker { name: string; accent: string; }

// 仲間を増やすときはこのテーブルに1行足す。
const SPEAKERS: Record<string, Speaker> = {
  mira:  { name: '賢者ミラ', accent: '#6f5bd0' },
  allen: { name: 'アレン',   accent: '#2f6bd6' },
  slime: { name: 'スライム', accent: '#3fb55b' },
};

export class CharTalk extends HTMLElement {
  connectedCallback(): void {
    const id = this.getAttribute('speaker') ?? '';
    const info = SPEAKERS[id] ?? { name: this.getAttribute('name') ?? '？', accent: '#8a7fa6' };
    const side = this.getAttribute('side') === 'right' ? 'right' : 'left';
    const avatar = this.getAttribute('avatar');
    const body = this.innerHTML.trim();
    const initial = info.name.slice(0, 1);

    this.classList.add('char-talk', `side-${side}`);
    this.style.setProperty('--accent', info.accent);

    const avatarHtml = avatar
      ? '<img class="avatar" alt="">'
      : `<span class="avatar avatar-ph">${initial}</span>`;
    this.innerHTML =
      avatarHtml +
      '<div class="bubble"><span class="name"></span><div class="say"></div></div>';

    (this.querySelector('.name') as HTMLElement).textContent = info.name;
    (this.querySelector('.say') as HTMLElement).innerHTML = body;
    if (avatar) {
      const img = this.querySelector('img.avatar') as HTMLImageElement;
      img.src = avatar;
      img.alt = info.name;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/char-talk.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add src/components/char-talk.ts src/components/char-talk.test.ts
git commit -m "feat: char-talk コンポーネント（キャラクター会話）"
```

---

### Task 3: コンポーネント登録

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: import を追加**

`src/index.ts` の既存 import 群に追加:

```ts
import { CourseNav } from './components/course-nav';
import { PointBox } from './components/point-box';
import { CharTalk } from './components/char-talk';
```

- [ ] **Step 2: define を追加**

`course-nav` の define の下に追加:

```ts
if (!customElements.get('course-nav')) customElements.define('course-nav', CourseNav);
if (!customElements.get('point-box')) customElements.define('point-box', PointBox);
if (!customElements.get('char-talk')) customElements.define('char-talk', CharTalk);
```

- [ ] **Step 3: tsc/build 確認**

Run: `npx tsc --noEmit && npm run -s build`
Expected: tscエラー0、build成功

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: point-box / char-talk を登録"
```

---

### Task 4: php-run を縦積み＋実行後出力に

**Files:**
- Modify: `src/components/php-run.ts`
- Modify: `src/components/php-run.test.ts`

ねらい: 実行前は空の出力枠を出さない（`hidden`）。実行で表示。ボタンは従来どおりコード直下・左。

- [ ] **Step 1: 失敗テストを追加**（実行前 hidden、実行後表示）

`src/components/php-run.test.ts` の `describe` 内に追加:

```ts
  it('実行前は出力が隠れていて、実行後に表示される', async () => {
    configure({ executor: new FakeExecutor({ stdout: 'やあ' }) });
    const el = mount('<script type="text/php">echo "x";</script>');
    const out = el.querySelector('.output') as HTMLElement;
    expect(out.hidden).toBe(true);
    await el.execute();
    expect(out.hidden).toBe(false);
    expect(out.textContent).toBe('やあ');
  });
```

- [ ] **Step 2: Run（失敗確認）**

Run: `npx vitest run src/components/php-run.test.ts`
Expected: FAIL（現状は idle テキスト入りで hidden=false）

- [ ] **Step 3: 実装変更**

`src/components/php-run.ts` の `render()` の output 行と `execute()` 冒頭を変更:

render（output を hidden に、idle 文言は撤去）:
```ts
      '</div>' +
      '<div class="output" aria-live="polite" hidden></div>';
```

execute（冒頭で表示）:
```ts
  async execute(): Promise<void> {
    const out = this.querySelector('.output') as HTMLElement;
    out.hidden = false;
    out.textContent = '実行中…';
    out.classList.remove('has-error');
```

- [ ] **Step 4: Run（成功確認）**

Run: `npx vitest run src/components/php-run.test.ts`
Expected: PASS（既存4＋新1＝5 tests）

- [ ] **Step 5: Commit**

```bash
git add src/components/php-run.ts src/components/php-run.test.ts
git commit -m "feat(php-run): 出力は実行後のみ表示（空エリア撤去）"
```

---

### Task 5: php-exercise を縦積み＋出力は実行後

**Files:**
- Modify: `src/components/php-exercise.ts`

ねらい: 演習も実行前は空の出力枠を出さない。レイアウトCSSはTask6で縦積みに。

- [ ] **Step 1: render の output を hidden に**

`src/components/php-exercise.ts` の `render()`:
```ts
      '<div class="output" aria-live="polite" hidden></div>' +
```

- [ ] **Step 2: runCode 冒頭で表示、clearResult で再非表示**

`runCode()` の出力取得直後:
```ts
    const out = this.querySelector('.output') as HTMLElement;
    out.hidden = false;
```
`clearResult()` の最後に追記:
```ts
    (o as HTMLElement).hidden = true;
```
（`o` は既存の `.output` 参照。型を `HTMLElement` として扱う。）

- [ ] **Step 3: tsc/単体確認**

Run: `npx tsc --noEmit && npx vitest run src/components/php-exercise.test.ts`
Expected: tsc 0、既存8 tests PASS（hidden化はDOM存在に影響しないため既存テスト不変）

- [ ] **Step 4: Commit**

```bash
git add src/components/php-exercise.ts
git commit -m "feat(php-exercise): 出力は実行後のみ表示"
```

---

### Task 6: スタイル（縦積み統一・余白・新コンポーネント）

**Files:**
- Modify: `src/styles/lesson.css`
- Modify: `src/styles/course.css`

- [ ] **Step 1: lesson.css — split撤去・縦積み・エディタ余白・新コンポーネント基本**

`src/styles/lesson.css` の以下2箇所を変更/追加。

(a) split グリッド行を縦積みへ置換。該当行:
```css
.layout-split .panes, .php-run.layout-split { display: grid; grid-template-columns: 1fr 1fr; }
.php-exercise .panes { display: grid; grid-template-columns: 1fr 1fr; }
```
を、次に置換:
```css
/* レイアウトは全コンポーネント縦積みに統一（コード→操作→結果） */
.php-run.layout-split, .php-exercise .panes { display: block; }
.php-exercise .editor-host { min-height: 7.5rem; }
.php-run .output[hidden], .php-exercise .output[hidden] { display: none; }
```
さらに末尾のメディアクエリ内の `grid-template-columns: 1fr;` 行（split用）は不要になるため削除:
```css
@media (max-width: 640px) {
  .php-run.layout-split, .php-exercise .panes { grid-template-columns: 1fr; }
}
```
→ ブロック自体を削除。

(b) ファイル末尾に新コンポーネントの基本スタイルを追加:
```css
/* ===== point-box ===== */
.point-box { display: block; margin: 1rem 0; border: 1px solid #d8dee9; border-radius: 10px;
  background: #fffdf6; padding: .6rem .9rem; }
.point-box .point-head { display: flex; align-items: center; gap: .4rem; font-weight: 700; margin-bottom: .3rem; }
.point-box .point-list { margin: 0; padding-left: 1.4rem; }
.point-box .point-list li { margin: .15rem 0; }

/* ===== char-talk ===== */
.char-talk { display: flex; gap: .6rem; align-items: flex-start; margin: .7rem 0; }
.char-talk.side-right { flex-direction: row-reverse; }
.char-talk .avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; flex: none;
  border: 2px solid var(--accent, #8a7fa6); background: #fff; }
.char-talk .avatar-ph { display: grid; place-items: center; font-weight: 700; color: #fff;
  background: var(--accent, #8a7fa6); }
.char-talk .bubble { position: relative; background: #fff; border: 1px solid #e0e4ec; border-radius: 12px;
  padding: .5rem .8rem; max-width: 80%; }
.char-talk .bubble .name { display: block; font-size: .75rem; font-weight: 700; color: var(--accent, #6a6a6a); margin-bottom: .15rem; }
.char-talk .say { white-space: normal; }
```

- [ ] **Step 2: course.css — body.rpg 用テーマ**

`src/styles/course.css` 末尾（`@media (prefers-reduced-motion)` の前後どちらでも可）に追加:
```css
/* point-box（羊皮紙＋金枠） */
body.rpg .lesson .point-box {
  background: #fbf2dd; border: 1px solid var(--frame); border-left: 5px solid var(--accent-magic);
  border-radius: 6px; color: var(--ink);
}
body.rpg .lesson .point-box .point-head { color: var(--frame-dark); }

/* char-talk（吹き出し＋金縁アイコン） */
body.rpg .lesson .char-talk .avatar { border-color: var(--frame); box-shadow: 0 2px 6px rgba(0,0,0,.3); }
body.rpg .lesson .char-talk .bubble {
  background: #fff8e8; border: 1px solid var(--frame); border-radius: 12px; color: var(--ink);
}
body.rpg .lesson .char-talk.side-left .bubble { border-top-left-radius: 2px; }
body.rpg .lesson .char-talk.side-right .bubble { border-top-right-radius: 2px; }
```

- [ ] **Step 3: build 確認**

Run: `npm run -s build`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add src/styles/lesson.css src/styles/course.css
git commit -m "style: 縦積み統一・エディタ余白・point-box/char-talk スタイル"
```

---

### Task 7: A01 本文を全面書き換え

**Files:**
- Modify: `lessons/phase-a/a01-variables.html`

方針: 普通の日本語（漢字、余分な半角スペース全廃）。会話=`char-talk`、要点=`point-box`、配列予告は削除。演習は「値変え→穴埋め→記述」。キャラ画像は `../assets/img/a01/char/{mira,allen,slime}.png`（未生成でもプレースホルダで崩れない）。

- [ ] **Step 1: `<article class="lesson">` 〜 `</article>` を次の内容へ置換**

```html
    <h1>A01 はじまりの村 — 名乗りを上げよ</h1>

    <figure>
      <img src="../assets/img/a01/a01-hero.png" alt="夜明けの草原に立つ勇者の後ろ姿。遠くに城と山" />
      <figcaption>ようこそ、<b>CodeQuest</b> へ。あなたの冒険が、いま始まる。</figcaption>
    </figure>

    <char-talk speaker="mira" side="left" avatar="../assets/img/a01/char/mira.png">
      ようこそ、勇者よ。わたしは案内人のミラ。このページのコードは<b>本物</b>。ボタンを押すと、すぐ下で動きますよ。
    </char-talk>
    <char-talk speaker="allen" side="right" avatar="../assets/img/a01/char/allen.png">
      コードって、むずかしそう…。ぼくにもできるかな？
    </char-talk>
    <char-talk speaker="mira" side="left" avatar="../assets/img/a01/char/mira.png">
      大丈夫。まずは1回、<b>▶ 実行</b> ボタンを押すだけ。やってみましょう。
    </char-talk>

    <div class="goals">
      <b>このクエストでできるようになること</b>
      <ul>
        <li>画面に文字を出す（<code>echo</code>）</li>
        <li>名前をつけて値を覚えさせる（<b>変数</b>）</li>
        <li>文字をつなげて、自分だけの物語を表示する</li>
      </ul>
    </div>

    <div class="part">
      <span class="tag">① 冒険のはじまり 🔮</span>

      <h2>つかいかた</h2>
      <p>コードのすぐ下にある <b>▶ 実行</b> ボタンを押すと、プログラムが動いて、<b>ボタンのすぐ下</b>に結果が出ます。すべてのコードに <b>▶ 実行</b> ボタンが付いています。まずは押してみましょう。</p>
      <php-run><script type="text/php">
echo "CodeQuestへ ようこそ！";
      </script></php-run>

      <char-talk speaker="allen" side="right" avatar="../assets/img/a01/char/allen.png">
        あ、文字が出た！押すと動くんだ。
      </char-talk>
      <p class="callout">🧙 ミラ：明るい入力欄の文字は書き換えられます。書き換えたら <b>▶ 実行</b>。元に戻すときは <b>↺ 最初に戻す</b>（書いた内容は消えてやり直せます）。「答えを見る」は一度 ▶ 実行 してから出てきます。</p>

      <h2>ステップ1 — 画面に文字を出す（<code>echo</code>）</h2>
      <p><code>echo</code>（エコー）は「画面に出す」命令です。</p>
      <point-box title="echo の覚えどころ">
        <li>出したい文字は <code>"&nbsp;"</code>（ダブルクオート）で囲む</li>
        <li>文の終わりに <code>;</code>（セミコロン）を付ける</li>
        <li><code>//</code> から行末は<b>メモ（コメント）</b>。コンピュータは読み飛ばします</li>
      </point-box>
      <php-run><script type="text/php">
echo "冒険の書を ひらいた";
      </script></php-run>

      <p><b>やってみよう：</b><code>"&nbsp;"</code> の中の <code>ここを書きかえる</code> を消して、<code>旅に出る</code> と打ってみよう。採点は文字の中身が同じかどうかで決まります（前後の空白は気にしなくてOK）。</p>
      <php-exercise expected="旅に出る" solution='<?php
echo "旅に出る";'>
        <script type="text/php">
// " " の中を消して「旅に出る」と打ってね
echo "ここを書きかえる";
        </script>
      </php-exercise>

      <h2>ステップ2 — 名前をつけて覚えさせる（変数）</h2>
      <char-talk speaker="allen" side="right" avatar="../assets/img/a01/char/allen.png">
        同じ「勇者」を何回も打つの、ちょっと面倒だなあ。
      </char-talk>
      <php-run><script type="text/php">
echo "勇者よ、よくぞ来た！";
echo "勇者の冒険が始まる！";
      </script></php-run>
      <char-talk speaker="mira" side="left" avatar="../assets/img/a01/char/mira.png">
        そこで<b>変数</b>。一度だけ名前をつけて覚えさせれば、何度でも呼び出せます。
      </char-talk>
      <php-run><script type="text/php">
$name = "勇者";
echo $name . "よ、よくぞ来た！";
echo $name . "の冒険が始まる！";
      </script></php-run>

      <point-box title="変数のポイント">
        <li><code>$name</code> … 変数は <code>$</code>（ドル）で始める。これが「覚えさせる名前」</li>
        <li><code>=</code> … 右の値を、その名前に<b>入れる</b>こと（むずかしく言うと「代入」）。算数の「ひとしい」ではありません</li>
        <li><code>.</code>（ドット） … 文字どうしを<b>つなぐ</b>記号（足し算の <code>+</code> ではありません）</li>
      </point-box>

      <p><b>まずは値を変えてみよう：</b>下の <code>$name</code> の <code>"勇者"</code> を、あなたの好きな名前に書き換えて <b>▶ 実行</b>。表示が変わります。（この問題は採点なし。自由にどうぞ）</p>
      <php-exercise>
        <script type="text/php">
$name = "勇者";
echo $name . "の冒険が始まる！";
        </script>
      </php-exercise>

      <char-talk speaker="mira" side="left" avatar="../assets/img/a01/char/mira.png">
        変数の良いところは、<b>あとから中身を変えられる</b>こと。レベルアップで数を書きかえてみましょう。
      </char-talk>
      <php-run><script type="text/php">
$lv = 1;
echo "いまのレベルは" . $lv;

$lv = 5;
echo "レベルアップ！ いまはレベル" . $lv;
      </script></php-run>

      <p>（ここからは、例として名前を <b>アレン</b> として進めます。）</p>
      <p><b>クエスト：</b><code>$name</code> に <code>アレン</code> を入れて、<code>アレンの冒険が始まる！</code> と表示しよう。</p>
      <php-exercise expected="アレンの冒険が始まる！" solution='<?php
$name = "アレン";
echo $name . "の冒険が始まる！";'>
        <script type="text/php">
$name = "アレン";
// $name と "の冒険が始まる！" を . でつないで出そう
        </script>
      </php-exercise>

      <h2>ステップ3 — 数とステータス、そして連結</h2>
      <p>名前のような<b>文字</b>は <code>"&nbsp;"</code> で囲みますが、HPやレベルのような<b>数</b>は囲みません。覚えるのはこれだけ：文字は囲む、数は囲まない。</p>
      <php-run><script type="text/php">
$name = "アレン";
$lv = 5;
$hp = 20;
echo $name . " レベル" . $lv . " HP" . $hp;
      </script></php-run>
      <point-box title="連結のヒント">
        <li><code>.</code> は<b>いくつでも</b>つなげる（2個でも4個でも同じ）</li>
        <li><code>"&nbsp;HP"</code> のように、<code>"&nbsp;"</code> の中にはスペースや記号も<b>そのまま</b>入れられる</li>
      </point-box>

      <p><b>クエスト：</b><code>$name = "アレン"</code> と <code>$hp = 20</code> を使って、<code>アレン HP20</code> と表示しよう。（「アレン」と「HP20」の間は半角スペース1つ。）</p>
      <php-exercise expected="アレン HP20" solution='<?php
$name = "アレン";
$hp = 20;
echo $name . " HP" . $hp;'>
        <script type="text/php">
$name = "アレン";
$hp = 20;
// $name と " HP" と $hp を . でつないで出そう
        </script>
      </php-exercise>
    </div>

    <div class="part real">
      <span class="tag">② じつは、実際のアプリも同じ ⚔️</span>
      <p><b>ここからは現実のアプリの話。</b>変数はゲームだけのものではありません。買い物アプリでも、商品名や値段を変数に覚えさせて使います。題材が違うだけで、仕組みは<b>まったく同じ</b>です。</p>
      <php-run><script type="text/php">
$product = "やくそう";
$price = 50;
echo $product . "は" . $price . "ゴールド";
      </script></php-run>
    </div>

    <h2>まとめ ＆ 仕上げのクエスト</h2>
    <point-box title="このクエストのまとめ">
      <li>画面に出すのは <code>echo "文字";</code>（最後に <code>;</code>）</li>
      <li>変数は <code>$名前 = 値;</code> で覚えさせ、何度でも呼び出せる・あとで変えられる（文字は <code>"&nbsp;"</code>、数はそのまま）</li>
      <li>文字をつなぐのは <code>.</code></li>
    </point-box>
    <p><b>仕上げのクエスト：</b><code>$name = "アレン"</code>、<code>$lv = 5</code> を使って、<code>アレン (レベル5)</code> と表示しよう。
    （「アレン」と「(」の間は半角スペース1つ。かっこは<b>半角の <code>(</code> <code>)</code></b>。<code>"&nbsp;(レベル"</code> のように、かっこは <code>"&nbsp;"</code> の中に入れます。）</p>
    <php-exercise expected="アレン (レベル5)" solution='<?php
$name = "アレン";
$lv = 5;
echo $name . " (レベル" . $lv . ")";'>
      <script type="text/php">
$name = "アレン";
$lv = 5;
// $name と " (レベル" と $lv と ")" を . でつないで出そう
      </script>
    </php-exercise>

    <char-talk speaker="slime" side="right" avatar="../assets/img/a01/char/slime.png">
      やったね！変数、つかえるようになったぷに〜
    </char-talk>

    <course-nav manifest="../course.json"></course-nav>
```

- [ ] **Step 2: 「次のクエスト予告（配列）」が消えていることを確認**

Run: `grep -c "配列\|yuusha\|次のクエストの予告" lessons/phase-a/a01-variables.html`
Expected: `0`

- [ ] **Step 3: 余分な半角スペースが出力文字列から消えているか目視**

Run: `grep -n 'echo "' lessons/phase-a/a01-variables.html`
Expected: 「冒険が始まる」等が半角スペースなしで漢字表記（"冒険の書を ひらいた" のような演出スペースは可、ただし出力一致対象の演習文字列に余分なスペースを残さない）

- [ ] **Step 4: build 確認**

Run: `npm run -s build`
Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add lessons/phase-a/a01-variables.html
git commit -m "content(A01): 会話/ポイント/図解中心へ刷新・漢字化・配列予告削除・値変え演習"
```

---

### Task 8: 検証（単体・tsc・build・E2E）

**Files:**
- Modify(必要時): `tests/e2e/lesson.spec.ts`, `tests/e2e/acceptance.spec.ts`

- [ ] **Step 1: 単体・tsc・build**

Run: `npm run -s test && npx tsc --noEmit && npm run -s build`
Expected: 単体 全PASS（36＋新6＝42前後）、tsc 0、build 成功

- [ ] **Step 2: E2E**

Run: `npx playwright test`
Expected: 11 PASS。落ちる場合は原因を確認:
- `php-run` は実行前 output hidden → 既存テストは押下後に確認しており影響なし。
- `php-exercise` の output hidden → 押下後表示で既存アサーション維持。
- A01 演習の expected 変更（"旅に出る" 等）に伴い course-integrity（solution→正解）はソリューションが新expectedと一致しているため緑のはず。

- [ ] **Step 3: 失敗時のみE2E修正**（セレクタ前提が変わった箇所だけ最小修正し再実行）

- [ ] **Step 4: Commit（修正があれば）**

```bash
git add tests/e2e
git commit -m "test(e2e): 縦積み・実行後出力に追従"
```

---

### Task 9: キャラ／挿絵の生成と配置（GPT・md5重複チェック）

**Filesः**
- Assets: `lessons/assets/img/a01/char/{mira,allen,slime}.png`、必要に応じ追加シーン挿絵

注意: プレースホルダで崩れないため、画像が無くてもページは成立する。画像は後追いでも可。Viteは同一バイトのファイルを1ハッシュに統合するため、**DLごとに md5 を確認し重複を排除**する。

- [ ] **Step 1: 生成（Claude-in-Chrome で ChatGPT を操作）**
各キャラの正方形・顔中心・背景シンプル（円形くり抜き前提）アイコンを生成:
  - mira: 賢者の女性、紫のローブ、やさしい笑顔、正方形アイコン
  - allen: 見習い勇者の少年、青い服、素朴な表情、正方形アイコン
  - slime: 緑のスライム、目がくりっと、かわいい、正方形アイコン

- [ ] **Step 2: ダウンロード→重複チェック**

```bash
mkdir -p lessons/assets/img/a01/char
# 各DLを所定名で配置後:
md5 lessons/assets/img/a01/char/*.png
```
Expected: 3つの md5 が**すべて異なる**こと（同一があれば、そのキャラを再DL）

- [ ] **Step 3: build で取り込み確認**

Run: `npm run -s build && ls dist/assets | grep -i 'mira\|allen\|slime'`
Expected: 3つの別ハッシュ画像が出力される

- [ ] **Step 4: Commit**

```bash
git add lessons/assets/img/a01/char
git commit -m "assets(A01): キャラアイコン（ミラ/アレン/スライム）"
```

---

### Task 10: 実機確認・公開

- [ ] **Step 1: Preview で目視**（`npm run dev` → A01）
確認項目: 会話の吹き出し＋円形アイコン、point-box、実行ボタンがコード直下・左で統一、実行前に空の出力枠が無い、実行後に結果表示、エディタに書く余白、漢字の自然な日本語、配列予告が無い。

- [ ] **Step 2: 公開（ユーザー承認後）**

```bash
git push origin master
```
Pages デプロイ完了を `gh run watch` で確認し、ライブURLで200と新要素を確認。

---

## Self-Review

**1. Spec coverage（スペック各要件→タスク対応）**
- 配列予告削除 → Task7 Step1/Step2 ✅
- エディタ余白 → Task6 (`min-height:7.5rem`) ✅
- 値変え演習から段階化 → Task7（採点なし値変え→穴埋め→記述→仕上げ）✅
- 空の白エリア撤去・実行後表示 → Task4(php-run)/Task5(php-exercise)/Task6(`output[hidden]`) ✅
- 半角スペース全廃・漢字 → Task7 ✅
- point表示コンポーネント → Task1 ✅
- キャラ会話コンポーネント → Task2 ✅
- 実行ボタン位置統一（コード直下・左、split廃止）→ Task4/Task6（split CSS撤去・縦積み）✅
- 画像まとめ生成（md5重複チェック）→ Task9 ✅
- 単体/tsc/build/E2E緑 → Task8 ✅

**2. Placeholder scan:** 各コード/CSS/HTMLは実体を記載。TBD無し。

**3. Type consistency:** `PointBox`/`CharTalk` のクラス名・`SPEAKERS` キー（mira/allen/slime）・属性（speaker/side/avatar/title）はTask1/2/3/7で一致。`.output[hidden]` の扱いはTask4/5/6で一致。

**4. Ambiguity:** 「演出用スペース（"冒険の書を ひらいた"）は可／出力一致対象の演習文字列は余分スペース無し」をTask7 Step3で明記。
