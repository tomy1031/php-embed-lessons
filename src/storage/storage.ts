const PREFIX = 'phplesson:exercise:';

export function loadCode(id: string): string | null {
  try { return localStorage.getItem(PREFIX + id); } catch { return null; }
}
export function saveCode(id: string, code: string): void {
  try { localStorage.setItem(PREFIX + id, code); } catch { /* quota/無効時は無視 */ }
}
export function clearCode(id: string): void {
  try { localStorage.removeItem(PREFIX + id); } catch { /* 無視 */ }
}
