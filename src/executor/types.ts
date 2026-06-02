export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
export interface Executor {
  run(code: string, opts?: { timeoutMs?: number }): Promise<RunResult>;
}
