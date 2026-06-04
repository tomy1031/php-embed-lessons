export type MatchMode = 'exact' | 'contains';
export interface CheckResult {
  pass: boolean;
  normalizedExpected: string;
  normalizedActual: string;
}

export function normalize(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    // 全角スペース・全角コロンは半角として扱う：初学者は両者を目視で区別できず、
    // 「合っているように見えるのに不正解」という理不尽な詰まりを生むため。
    .replace(/　/g, ' ')
    .replace(/：/g, ':')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

export function check(actual: string, expected: string, mode: MatchMode = 'exact'): CheckResult {
  const normalizedActual = normalize(actual);
  const normalizedExpected = normalize(expected);
  const pass =
    mode === 'contains'
      ? normalizedActual.includes(normalizedExpected)
      : normalizedActual === normalizedExpected;
  return { pass, normalizedExpected, normalizedActual };
}
