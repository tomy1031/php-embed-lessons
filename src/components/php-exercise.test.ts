import { PhpExercise } from './php-exercise';
import { configure } from '@/runtime/config';
import { FakeExecutor } from '@/executor/fake-executor';
import { fakeEditorFactory } from '@/editor/fake-editor';

beforeAll(() => {
  if (!customElements.get('php-exercise')) customElements.define('php-exercise', PhpExercise);
});

function mount(attrs: string, php: string): PhpExercise {
  const el = document.createElement('php-exercise') as PhpExercise;
  for (const a of attrs.split(' ').filter(Boolean)) {
    const [k, v] = a.split('=');
    el.setAttribute(k, v ? v.replace(/"/g, '') : '');
  }
  el.innerHTML = `<script type="text/php">${php}</script>`;
  document.body.appendChild(el);
  return el;
}

describe('<php-exercise>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    configure({ editorFactory: fakeEditorFactory });
  });

  it('スターターコードがエディタ初期値になる', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('', '$a = 7;');
    expect(el.getEditorValue()).toBe('$a = 7;');
  });

  it('expected一致で正解表示', async () => {
    configure({ executor: new FakeExecutor({ stdout: '15' }) });
    const el = mount('expected="15"', '// code');
    await el.runCode();
    expect(el.querySelector('.result')!.textContent).toContain('正解');
    expect(el.querySelector('.result')!.classList.contains('pass')).toBe(true);
  });

  it('expected不一致で不正解表示', async () => {
    configure({ executor: new FakeExecutor({ stdout: '16' }) });
    const el = mount('expected="15"', '// code');
    await el.runCode();
    expect(el.querySelector('.result')!.textContent).toContain('不正解');
    expect(el.querySelector('.result')!.classList.contains('fail')).toBe(true);
  });

  it('expected無しは採点しない', async () => {
    configure({ executor: new FakeExecutor({ stdout: 'anything' }) });
    const el = mount('', '// free');
    await el.runCode();
    expect(el.querySelector('.result')!.textContent).toBe('');
  });

  it('リセットでスターターに戻り保存も消える', async () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('id="ex1"', 'START');
    el.setEditorValue('CHANGED');
    expect(localStorage.getItem('phplesson:exercise:ex1')).toBe('CHANGED');
    el.reset();
    expect(el.getEditorValue()).toBe('START');
    expect(localStorage.getItem('phplesson:exercise:ex1')).toBeNull();
  });

  it('保存済みコードがあれば復元する', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    localStorage.setItem('phplesson:exercise:ex2', 'SAVED');
    const el = mount('id="ex2"', 'START');
    expect(el.getEditorValue()).toBe('SAVED');
  });

  it('solution指定時は初期非表示、初回実行後に出て反映される', async () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('solution="ans"', 'START');
    const btn = el.querySelector('.solution') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.hidden).toBe(true); // 答えを最初から見せない
    await el.runCode(); // 一度実行すると出現
    expect(btn.hidden).toBe(false);
    btn.click();
    expect(el.getEditorValue()).toContain('ans');
  });

  it('solution未指定なら模範解答ボタンは出ない', () => {
    configure({ executor: new FakeExecutor({ stdout: '' }) });
    const el = mount('expected="1"', 'START');
    expect(el.querySelector('.solution')).toBeNull();
  });
});
