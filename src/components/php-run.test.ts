import { PhpRun } from './php-run';
import { configure } from '@/runtime/config';
import { FakeExecutor } from '@/executor/fake-executor';

beforeAll(() => {
  if (!customElements.get('php-run')) customElements.define('php-run', PhpRun);
});

function mount(html: string): PhpRun {
  const el = document.createElement('php-run') as PhpRun;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('<php-run>', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('実行結果をoutputに表示する', async () => {
    configure({ executor: new FakeExecutor({ stdout: 'こんにちは' }) });
    const el = mount('<script type="text/php">echo "x";</script>');
    await el.execute();
    expect(el.querySelector('.output')!.textContent).toBe('こんにちは');
  });

  it('1行はcompactレイアウト', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('<script type="text/php">echo 1;</script>');
    expect(el.classList.contains('layout-compact')).toBe(true);
  });

  it('複数行はsplitレイアウト', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('<script type="text/php">$a=1;\necho $a;</script>');
    expect(el.classList.contains('layout-split')).toBe(true);
  });

  it('stderrはエラー表示になる', async () => {
    configure({ executor: new FakeExecutor({ stdout: '', stderr: 'Parse error' }) });
    const el = mount('<script type="text/php">bad</script>');
    await el.execute();
    expect(el.querySelector('.output')!.classList.contains('has-error')).toBe(true);
  });
});
