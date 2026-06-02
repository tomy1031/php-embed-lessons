import { fakeEditorFactory } from './fake-editor';

describe('fakeEditorFactory', () => {
  it('初期値を保持しget/setできる', () => {
    const ed = fakeEditorFactory(document.createElement('div'), 'init');
    expect(ed.getValue()).toBe('init');
    ed.setValue('next');
    expect(ed.getValue()).toBe('next');
  });
  it('onChangeはsetValueで発火する', () => {
    const ed = fakeEditorFactory(document.createElement('div'), '');
    let seen = '';
    ed.onChange((v) => (seen = v));
    ed.setValue('x');
    expect(seen).toBe('x');
  });
});
