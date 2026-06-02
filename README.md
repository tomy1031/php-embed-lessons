# PHP埋め込み実行型 学習システム

HTMLに `<php-run>` / `<php-exercise>` を置くだけで、ブラウザ内（php-wasm）でPHPを実行・採点できる学習教材を作れます。

## セットアップ
```bash
npm install
npx playwright install chromium   # E2Eを動かす場合
```

## 開発（執筆中のプレビュー）
```bash
npm run dev        # http://localhost:5173/lessons/index.html
```

## レッスンの書き方（主：HTML）
`lessons/` に HTML を追加し、`<head>` で `/src/index.ts` を読み込みます。

- 表示ブロック: `<php-run><script type="text/php">echo "hi";</script></php-run>`
  - 1行=コンパクト（結果は下）、複数行=左右（左コード/右出力）。`layout="compact|split|stacked"` で上書き。
- 演習ブロック: `<php-exercise expected="15"><script type="text/php">...</script></php-exercise>`
  - `expected` を書くと採点ON（正解/不正解）。無ければ自由練習。
  - `solution="<?php ..."` で模範解答ボタン。`match="exact|contains"`。`id="..."` で保存キー固定。
- コードは必ず `<script type="text/php">` に入れる（`<` `&` のエスケープ不要）。

## レッスンの書き方（従：Markdown）
`lessons-md/*.md` に書き、` ```php run ` / ` ```php exercise expected="..." ` のフェンスを使う。
```bash
npm run build:md   # lessons/md-*.html を生成
```

## 配布（v1＝リンク）
```bash
npm run build      # dist/ に静的バンドル（wasm自己同梱・base相対）
```
`dist/` を無料の静的ホスティング（GitHub Pages / Netlify / Cloudflare Pages 等）に公開し、URLを学習者に共有する。受け取る人はクリックするだけで実行できる。

## テスト
```bash
npm test           # 単体（Vitest/jsdom）
npm run e2e        # 実ブラウザ（Playwright、php-wasm実行）
```

## 注意（v1の制限）
- PHPはブラウザ内（php-wasm）で動きます。実MySQLやサーバー固有機能は対象外です。
- v1はメインスレッド実行のため**無限ループを強制停止できません**。教材コードに無限ループを含めないでください（将来Worker版で対応予定）。

## 将来拡張
オフラインZIP配布、XAMPP/MAMP（本物PHP）対応、WYSIWYG編集。詳細は `docs/superpowers/specs/2026-06-02-php-embed-learning-system-design.md`。
