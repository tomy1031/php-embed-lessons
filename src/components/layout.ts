export type Layout = 'compact' | 'split' | 'stacked';

export function nonEmptyLineCount(code: string): number {
  return code.split('\n').filter((l) => l.trim().length > 0).length;
}

export function decideLayout(code: string, override?: string | null): Layout {
  if (override === 'compact' || override === 'split' || override === 'stacked') return override;
  return nonEmptyLineCount(code) <= 1 ? 'compact' : 'split';
}
