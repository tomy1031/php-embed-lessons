import { PointBox } from './point-box';

beforeAll(() => {
  if (!customElements.get('point-box')) customElements.define('point-box', PointBox);
});

function mount(html: string, attrs: Record<string, string> = {}): PointBox {
  const el = document.createElement('point-box') as PointBox;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('<point-box>', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('title既定は「ここがポイント」、li件数を保つ', () => {
    const el = mount('<li>あ</li><li>い</li><li>う</li>');
    expect(el.querySelector('.point-title')!.textContent).toBe('ここがポイント');
    expect(el.querySelectorAll('.point-list li').length).toBe(3);
  });

  it('title属性を反映、liのHTML(code)を保持', () => {
    const el = mount('<li><code>echo</code> を使う</li>', { title: 'コツ' });
    expect(el.querySelector('.point-title')!.textContent).toBe('コツ');
    expect(el.querySelector('.point-list li code')!.textContent).toBe('echo');
  });
});
