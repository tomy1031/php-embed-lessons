import { configure } from './runtime/config';
import { WasmExecutor } from './executor/wasm-executor';
import { codeMirrorFactory } from './editor/codemirror';
import { PhpRun } from './components/php-run';
import { PhpExercise } from './components/php-exercise';
import './styles/lesson.css';

configure({ executor: new WasmExecutor(), editorFactory: codeMirrorFactory });

if (!customElements.get('php-run')) customElements.define('php-run', PhpRun);
if (!customElements.get('php-exercise')) customElements.define('php-exercise', PhpExercise);

export { configure };
