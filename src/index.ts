import { configure } from './runtime/config';
import { WasmExecutor } from './executor/wasm-executor';
import { codeMirrorFactory } from './editor/codemirror';
import { PhpRun } from './components/php-run';
import { PhpExercise } from './components/php-exercise';
import { CourseNav } from './components/course-nav';
import { PointBox } from './components/point-box';
import { CharTalk } from './components/char-talk';
import './styles/lesson.css';
import './styles/course.css';

configure({ executor: new WasmExecutor(), editorFactory: codeMirrorFactory });

if (!customElements.get('php-run')) customElements.define('php-run', PhpRun);
if (!customElements.get('php-exercise')) customElements.define('php-exercise', PhpExercise);
if (!customElements.get('course-nav')) customElements.define('course-nav', CourseNav);
if (!customElements.get('point-box')) customElements.define('point-box', PointBox);
if (!customElements.get('char-talk')) customElements.define('char-talk', CharTalk);

export { configure };
