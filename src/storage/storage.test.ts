import { saveCode, loadCode, clearCode } from './storage';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('保存して読み出せる', () => {
    saveCode('a#0', 'echo 1;');
    expect(loadCode('a#0')).toBe('echo 1;');
  });
  it('未保存はnull', () => {
    expect(loadCode('missing')).toBeNull();
  });
  it('削除できる', () => {
    saveCode('a#0', 'x');
    clearCode('a#0');
    expect(loadCode('a#0')).toBeNull();
  });
});
