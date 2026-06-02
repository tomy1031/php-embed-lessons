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
