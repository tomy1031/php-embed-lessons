import { normalize, check } from './checker';

describe('normalize', () => {
  it('CRLFをLFに統一し前後空白と行末空白を除去', () => {
    expect(normalize('  a  \r\nb \r\n')).toBe('a\nb');
  });
});
describe('check', () => {
  it('exact: 正規化後に一致でpass', () => {
    expect(check('15\n', '15').pass).toBe(true);
  });
  it('exact: 不一致でfail', () => {
    expect(check('16', '15').pass).toBe(false);
  });
  it('全角スペースは半角スペースとして扱う', () => {
    expect(check('アレン　HP20', 'アレン HP20').pass).toBe(true);
  });
  it('contains: 部分一致でpass', () => {
    expect(check('answer=15 ok', '15', 'contains').pass).toBe(true);
  });
  it('正規化結果を返す', () => {
    const r = check('15 \n', ' 15');
    expect(r.normalizedActual).toBe('15');
    expect(r.normalizedExpected).toBe('15');
  });
});
