// jsdomにはIntersectionObserverが無いので、observe時に即「表示中」を通知するスタブ
class IOStub {
  constructor(private cb: (entries: { isIntersecting: boolean; target: Element }[]) => void) {}
  observe(el: Element) { this.cb([{ isIntersecting: true, target: el }]); }
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error テスト環境への注入
globalThis.IntersectionObserver = IOStub;
