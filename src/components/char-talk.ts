interface Speaker { name: string; accent: string; }

// 仲間を増やすときはこのテーブルに1行足す。
const SPEAKERS: Record<string, Speaker> = {
  mira:  { name: '賢者ミラ', accent: '#6f5bd0' },
  allen: { name: 'アレン',   accent: '#2f6bd6' },
  slime: { name: 'スライム', accent: '#3fb55b' },
};

export class CharTalk extends HTMLElement {
  connectedCallback(): void {
    const id = this.getAttribute('speaker') ?? '';
    const info = SPEAKERS[id] ?? { name: this.getAttribute('name') ?? '？', accent: '#8a7fa6' };
    const side = this.getAttribute('side') === 'right' ? 'right' : 'left';
    const avatar = this.getAttribute('avatar');
    const body = this.innerHTML.trim();
    const initial = info.name.slice(0, 1);

    this.classList.add('char-talk', `side-${side}`);
    this.style.setProperty('--accent', info.accent);

    const avatarHtml = avatar
      ? '<img class="avatar" alt="">'
      : `<span class="avatar avatar-ph">${initial}</span>`;
    this.innerHTML =
      avatarHtml +
      '<div class="bubble"><span class="name"></span><div class="say"></div></div>';

    (this.querySelector('.name') as HTMLElement).textContent = info.name;
    (this.querySelector('.say') as HTMLElement).innerHTML = body;
    if (avatar) {
      const img = this.querySelector('img.avatar') as HTMLImageElement;
      img.alt = info.name;
      // 画像が未生成/読み込み失敗でも壊れた画像アイコンを出さず、頭文字プレースホルダに退避。
      img.addEventListener('error', () => {
        const ph = document.createElement('span');
        ph.className = 'avatar avatar-ph';
        ph.textContent = initial;
        img.replaceWith(ph);
      });
      img.src = avatar;
    }
  }
}
