import { CharTalk } from './char-talk';

beforeAll(() => {
  if (!customElements.get('char-talk')) customElements.define('char-talk', CharTalk);
});

function mount(body: string, attrs: Record<string, string> = {}): CharTalk {
  const el = document.createElement('char-talk') as CharTalk;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = body;
  document.body.appendChild(el);
  return el;
}

describe('<char-talk>', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('speakerで名前を引き、本文と左寄せを描画', () => {
    const el = mount('こんにちは', { speaker: 'mira' });
    expect(el.querySelector('.name')!.textContent).toBe('賢者ミラ');
    expect(el.querySelector('.say')!.textContent).toContain('こんにちは');
    expect(el.classList.contains('side-left')).toBe(true);
  });

  it('未知speakerは「？」にフォールバック', () => {
    const el = mount('x', { speaker: 'nobody' });
    expect(el.querySelector('.name')!.textContent).toBe('？');
  });

  it('side=rightで右寄せ、avatar無しはプレースホルダ', () => {
    const el = mount('y', { speaker: 'allen', side: 'right' });
    expect(el.classList.contains('side-right')).toBe(true);
    expect(el.querySelector('.avatar-ph')).toBeTruthy();
  });

  it('avatar属性があれば画像を出す', () => {
    const el = mount('z', { speaker: 'slime', avatar: '../x/slime.png' });
    const img = el.querySelector('img.avatar') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('../x/slime.png');
  });
});
