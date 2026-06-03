export class PointBox extends HTMLElement {
  connectedCallback(): void {
    const title = this.getAttribute('title') ?? 'ここがポイント';
    const items = Array.from(this.querySelectorAll('li')).map((li) => li.innerHTML);
    this.classList.add('point-box');
    this.innerHTML =
      '<div class="point-head"><span class="point-ico">💡</span><span class="point-title"></span></div>' +
      '<ol class="point-list">' +
      items.map((h) => `<li>${h}</li>`).join('') +
      '</ol>';
    (this.querySelector('.point-title') as HTMLElement).textContent = title;
  }
}
