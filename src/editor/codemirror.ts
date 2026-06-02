import type { CodeEditor, EditorFactory } from './types';

// 表示専用ページにCodeMirrorを読み込ませないよう、生成時に動的import
export const codeMirrorFactory: EditorFactory = (host: HTMLElement, initial: string): CodeEditor => {
  let view: import('@codemirror/view').EditorView | undefined;
  let value = initial;
  let changeCb: (v: string) => void = () => {};

  const ready = (async () => {
    const [{ EditorView, basicSetup }, { php }, { EditorState }] = await Promise.all([
      import('codemirror'), // EditorView と basicSetup（履歴・既定キーマップ等を内包）
      import('@codemirror/lang-php'),
      import('@codemirror/state'),
    ]);
    const listener = EditorView.updateListener.of((u) => {
      if (u.docChanged) {
        value = u.state.doc.toString();
        changeCb(value);
      }
    });
    view = new EditorView({
      parent: host,
      state: EditorState.create({ doc: initial, extensions: [basicSetup, php(), listener] }),
    });
  })();

  return {
    getValue: () => (view ? view.state.doc.toString() : value),
    setValue: (v: string) => {
      value = v;
      if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
    },
    onChange: (cb) => {
      changeCb = cb;
    },
    destroy: () => {
      void ready.then(() => view?.destroy());
    },
  };
};
