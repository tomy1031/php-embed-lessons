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
