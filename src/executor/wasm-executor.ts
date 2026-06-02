import type { Executor, RunResult } from './types';

// php-wasm の output/error イベントの detail は [string]（配列）で来る。
function toText(detail: unknown): string {
  if (Array.isArray(detail)) return detail.join('');
  return detail == null ? '' : String(detail);
}

export class WasmExecutor implements Executor {
  private phpPromise: Promise<import('php-wasm/PhpWeb').PhpWeb> | null = null;
  // php-wasm の output/error は単一インスタンス上の共有 EventTarget に流れる。
  // 複数ブロックが同時に run() すると出力が混ざるため、実行を直列化する。
  private chain: Promise<unknown> = Promise.resolve();

  private getPhp(): Promise<import('php-wasm/PhpWeb').PhpWeb> {
    if (!this.phpPromise) {
      this.phpPromise = (async () => {
        const { PhpWeb } = await import('php-wasm/PhpWeb');
        // autoTransaction を切り、IndexedDB 永続化（navigator.locks/syncfs）を避ける。
        // 学習用途では実行ごとに状態を持ち越す必要がないため。
        const php = new PhpWeb({ autoTransaction: false });
        await new Promise<void>((resolve) => {
          let done = false;
          const ok = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          php.addEventListener('ready', ok, { once: true });
          // ready が来ない環境向けの保険（バイナリ load 完了で十分なケース）
          void php.binary.then(ok);
        });
        return php;
      })();
    }
    return this.phpPromise;
  }

  run(code: string): Promise<RunResult> {
    const result = this.chain.then(
      () => this.runExclusive(code),
      () => this.runExclusive(code),
    );
    // 例外で連鎖が止まらないよう、待ち合わせ用の鎖は常に解決させる。
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async runExclusive(code: string): Promise<RunResult> {
    const php = await this.getPhp();

    let stdout = '';
    let stderr = '';
    const onOut = (e: Event) => {
      stdout += toText((e as CustomEvent).detail);
    };
    const onErr = (e: Event) => {
      stderr += toText((e as CustomEvent).detail);
    };
    php.addEventListener('output', onOut);
    php.addEventListener('error', onErr);

    const start = performance.now();
    let exitCode = 0;
    try {
      const trimmed = code.trimStart();
      const src = trimmed.startsWith('<?php') || trimmed.startsWith('<?') ? code : `<?php\n${code}`;
      exitCode = (await php.run(src)) ?? 0;
    } finally {
      php.removeEventListener('output', onOut);
      php.removeEventListener('error', onErr);
    }
    return { stdout, stderr, exitCode, durationMs: performance.now() - start };
  }
}
