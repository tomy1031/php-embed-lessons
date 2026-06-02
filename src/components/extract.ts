export function dedent(s: string): string {
  const lines = s.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => (l.match(/^[ \t]*/)?.[0].length ?? 0));
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min).trimEnd()).join('\n');
}

export function extractPhp(el: Element): string {
  const script = el.querySelector('script[type="text/php"]');
  const raw = script ? (script.textContent ?? '') : (el.textContent ?? '');
  return dedent(raw);
}
