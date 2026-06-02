import type { CodeEditor, EditorFactory } from './types';

export const fakeEditorFactory: EditorFactory = (_host: HTMLElement, initial: string): CodeEditor => {
  let value = initial;
  let changeCb: (v: string) => void = () => {};
  return {
    getValue: () => value,
    setValue: (v: string) => { value = v; changeCb(v); },
    onChange: (cb) => { changeCb = cb; },
    destroy: () => {},
  };
};
