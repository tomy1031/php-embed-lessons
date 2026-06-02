import { transformFences } from './md-transform';

describe('transformFences', () => {
  it('```php run を <php-run> に変換', () => {
    const md = '```php run\necho 1;\n```';
    expect(transformFences(md)).toBe(
      '<php-run><script type="text/php">\necho 1;\n</script></php-run>'
    );
  });
  it('```php exercise expected="15" を属性付き<php-exercise>に変換', () => {
    const md = '```php exercise expected="15"\n$a=1;\n```';
    expect(transformFences(md)).toBe(
      '<php-exercise expected="15"><script type="text/php">\n$a=1;\n</script></php-exercise>'
    );
  });
  it('通常のmarkdownはそのまま', () => {
    expect(transformFences('# 見出し\n本文')).toBe('# 見出し\n本文');
  });
});
