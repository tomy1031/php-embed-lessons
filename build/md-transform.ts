// ```php run / ```php exercise <属性...> のフェンスを部品に変換する。
// それ以外のmarkdownは触らない（marked本体はmd-to-html側で処理）。
const FENCE = /```php (run|exercise)([^\n]*)\n([\s\S]*?)\n```/g;

export function transformFences(md: string): string {
  return md.replace(FENCE, (_m, kind: string, attrs: string, code: string) => {
    const tag = kind === 'run' ? 'php-run' : 'php-exercise';
    const attrStr = attrs.trim() ? ` ${attrs.trim()}` : '';
    return `<${tag}${attrStr}><script type="text/php">\n${code}\n</script></${tag}>`;
  });
}
