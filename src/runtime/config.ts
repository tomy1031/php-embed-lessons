import type { Executor } from '@/executor/types';
import type { EditorFactory } from '@/editor/types';

interface PhpLessonConfig {
  executor: Executor;
  editorFactory: EditorFactory;
}
let current: Partial<PhpLessonConfig> = {};

export function configure(cfg: Partial<PhpLessonConfig>): void {
  current = { ...current, ...cfg };
}
export function getExecutor(): Executor {
  if (!current.executor) throw new Error('Executor is not configured');
  return current.executor;
}
export function getEditorFactory(): EditorFactory {
  if (!current.editorFactory) throw new Error('EditorFactory is not configured');
  return current.editorFactory;
}
