import { findNav, type Lesson } from '@/course/nav';

export class CourseNav extends HTMLElement {
  async connectedCallback(): Promise<void> {
    const manifestAttr = this.getAttribute('manifest') ?? 'course.json';
    const manifestUrl = new URL(manifestAttr, location.href);
    let lessons: Lesson[] = [];
    try {
      const res = await fetch(manifestUrl.href);
      lessons = ((await res.json()).lessons as Lesson[]) ?? [];
    } catch {
      /* manifest が無くてもページは壊さない */
    }
    const nav = findNav(lessons, location.pathname);
    const link = (l: Lesson | null, label: string) =>
      l ? `<a href="${new URL(l.path, manifestUrl).href}">${label} ${l.title}</a>` : '<span></span>';
    this.innerHTML =
      `<nav class="course-nav">${link(nav.prev, '← 前')}` +
      `<a class="toc" href="${new URL('index.html', manifestUrl).href}">目次</a>` +
      `${link(nav.next, '次 →')}</nav>`;
  }
}
