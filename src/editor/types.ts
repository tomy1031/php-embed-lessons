export interface CodeEditor {
  getValue(): string;
  setValue(value: string): void;
  onChange(cb: (value: string) => void): void;
  destroy(): void;
}
export type EditorFactory = (host: HTMLElement, initial: string) => CodeEditor;
