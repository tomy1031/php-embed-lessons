export interface Lesson { path: string; title: string; }
export interface Nav { prev: Lesson | null; next: Lesson | null; current: Lesson | null; }

export function findNav(lessons: Lesson[], currentPath: string): Nav {
  const idx = lessons.findIndex((l) => currentPath === l.path || currentPath.endsWith('/' + l.path));
  if (idx === -1) return { prev: null, next: null, current: null };
  return {
    prev: idx > 0 ? lessons[idx - 1] : null,
    next: idx < lessons.length - 1 ? lessons[idx + 1] : null,
    current: lessons[idx],
  };
}
