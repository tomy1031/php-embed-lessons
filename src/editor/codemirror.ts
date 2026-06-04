import type { CodeEditor, EditorFactory } from './types';

// 表示専用ページにCodeMirrorを読み込ませないよう、生成時に動的import
export const codeMirrorFactory: EditorFactory = (host: HTMLElement, initial: string): CodeEditor => {
  let view: import('@codemirror/view').EditorView | undefined;
  let value = initial;
  let changeCb: (v: string) => void = () => {};

  const ready = (async () => {
    const [{ EditorView, basicSetup }, { php }, { EditorState }, { HighlightStyle, syntaxHighlighting }, { tags: t }] =
      await Promise.all([
        import('codemirror'), // EditorView と basicSetup（履歴・既定キーマップ等を内包）
        import('@codemirror/lang-php'),
        import('@codemirror/state'),
        import('@codemirror/language'),
        import('@lezer/highlight'),
      ]);

    // 明るい羊皮紙系テーマ。背景クリーム＋濃い文字でコントラストAA以上を確保。
    const lightTheme = EditorView.theme(
      {
        '&': {
          color: '#2b2113',
          backgroundColor: '#fbf3df',
          fontSize: '0.95rem',
        },
        '.cm-content': {
          caretColor: '#1f2937',
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#1f2937', borderLeftWidth: '2px' },
        '&.cm-focused .cm-cursor': { borderLeftColor: '#1f2937' },
        '.cm-selectionBackground, ::selection': { backgroundColor: '#f0d9a0' },
        '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': { backgroundColor: '#e6c878' },
        '.cm-gutters': {
          backgroundColor: '#f3e6c4',
          color: '#8a6a2e',
          border: 'none',
          borderRight: '1px solid #e0cb95',
        },
        '.cm-activeLine': { backgroundColor: 'rgba(201,162,75,0.12)' },
        '.cm-activeLineGutter': { backgroundColor: 'rgba(201,162,75,0.20)' },
        '.cm-placeholder': { color: '#9a8252' },
        '.cm-matchingBracket': { backgroundColor: '#f0d9a0', outline: '1px solid #c9a24b' },
      },
      { dark: false },
    );

    // シンタックスハイライト：濃色で可読性重視（すべてコントラストAA以上）。
    const highlightStyle = HighlightStyle.define([
      { tag: t.keyword, color: '#9c2c8f', fontWeight: '700' },
      { tag: [t.string, t.special(t.string)], color: '#1f6b2e' },
      { tag: [t.number, t.bool, t.null], color: '#b23a00' },
      { tag: t.comment, color: '#7a6a4a', fontStyle: 'italic' },
      { tag: [t.variableName, t.propertyName], color: '#1d4ed8' },
      { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#7c3a09' },
      { tag: [t.operator, t.punctuation, t.separator], color: '#4a3a20' },
      { tag: t.bracket, color: '#4a3a20' },
    ]);

    const listener = EditorView.updateListener.of((u) => {
      if (u.docChanged) {
        value = u.state.doc.toString();
        changeCb(value);
      }
    });
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initial,
        extensions: [basicSetup, php(), EditorView.lineWrapping, lightTheme, syntaxHighlighting(highlightStyle), listener],
      }),
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
