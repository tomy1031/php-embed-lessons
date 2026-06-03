import { test, expect } from '@playwright/test';

// Phase A の各レッスンで、expected を持つ全演習が solution 実行で「正解」になることを検証
const pages = [
  '/lessons/phase-a/a01-variables.html',
  '/lessons/phase-a/a02-operators.html',
  '/lessons/phase-a/a03-control.html',
];

for (const p of pages) {
  test(`整合: ${p} の採点演習は solution で正解になる`, async ({ page }) => {
    await page.goto(p);
    const exs = page.locator('php-exercise[expected]');
    const n = await exs.count();
    expect(n).toBeGreaterThan(0); // 採点演習が必ずある
    for (let i = 0; i < n; i++) {
      const ex = exs.nth(i);
      const solution = ex.locator('button.solution');
      // 答えは初期非表示。まず一度実行してから「答えを見る」が出る。
      await expect(solution).toBeHidden();
      await ex.locator('button.run').click();        // 1回目の実行 → solution 出現
      await expect(solution).toBeVisible({ timeout: 60_000 });
      await solution.click();                         // 模範解答を入れる
      await ex.locator('button.run').click();         // 2回目の実行
      await expect(ex.locator('.result')).toContainText('正解', { timeout: 60_000 });
    }
  });
}
