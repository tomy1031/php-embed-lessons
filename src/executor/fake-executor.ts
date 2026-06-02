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
