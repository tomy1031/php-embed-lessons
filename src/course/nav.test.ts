import { findNav, type Lesson } from './nav';

const lessons: Lesson[] = [
  { path: 'phase-a/a01-variables.html', title: 'A01 変数とデータ型' },
  { path: 'phase-a/a02-operators.html', title: 'A02 演算子と比較' },
  { path: 'phase-a/a03-control.html', title: 'A03 制御構文' },
];

describe('findNav', () => {
  it('中間は前後を返す', () => {
    const nav = findNav(lessons, '/lessons/phase-a/a02-operators.html');
    expect(nav.prev?.path).toBe('phase-a/a01-variables.html');
    expect(nav.next?.path).toBe('phase-a/a03-control.html');
    expect(nav.current?.title).toBe('A02 演算子と比較');
  });
  it('先頭はprevがnull', () => {
    expect(findNav(lessons, '/lessons/phase-a/a01-variables.html').prev).toBeNull();
  });
  it('末尾はnextがnull', () => {
    expect(findNav(lessons, '/lessons/phase-a/a03-control.html').next).toBeNull();
  });
  it('未知パスは全てnull', () => {
    const nav = findNav(lessons, '/lessons/unknown.html');
    expect(nav.current).toBeNull();
    expect(nav.prev).toBeNull();
    expect(nav.next).toBeNull();
  });
});
