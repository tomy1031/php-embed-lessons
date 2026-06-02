import { dedent, extractPhp } from './extract';

describe('dedent', () => {
  it('共通インデントを除去し前後の空行を落とす', () => {
    expect(dedent('\n    $a = 1;\n    $b = 2;\n')).toBe('$a = 1;\n$b = 2;');
  });
});
describe('extractPhp', () => {
  it('script[type=text/php]の中身を取り出す', () => {
    const el = document.createElement('div');
    el.innerHTML = '<script type="text/php">  echo 1;  </script>';
    expect(extractPhp(el)).toBe('echo 1;');
  });
});
