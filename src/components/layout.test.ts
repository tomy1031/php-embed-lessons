import { nonEmptyLineCount, decideLayout } from './layout';

describe('layout', () => {
  it('空行を除いた行数を数える', () => {
    expect(nonEmptyLineCount('a\n\n b ')).toBe(2);
  });
  it('1行はcompact、複数行はsplit', () => {
    expect(decideLayout('echo 1;')).toBe('compact');
    expect(decideLayout('a;\nb;')).toBe('split');
  });
  it('overrideを優先', () => {
    expect(decideLayout('echo 1;', 'split')).toBe('split');
    expect(decideLayout('a;\nb;', 'stacked')).toBe('stacked');
  });
});
