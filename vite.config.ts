import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const lessonsDir = resolve(__dirname, 'lessons');
const input: Record<string, string> = {};
for (const f of readdirSync(lessonsDir)) {
  if (f.endsWith('.html')) input[f.replace(/\.html$/, '')] = resolve(lessonsDir, f);
}

export default defineConfig({
  base: './',
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: { exclude: ['php-wasm'] },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input } },
});
