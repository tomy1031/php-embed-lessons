import { test, expect } from '@playwright/test';

test('php-run が実ブラウザで実行され出力が出る', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const firstRun = page.locator('php-run').first();
  await firstRun.locator('button.run').click(); // 自動実行はしない：ボタンを押して実行
  await expect(firstRun.locator('.output')).toHaveText('こんにちは', { timeout: 60_000 });
});

test('php-exercise: 正答すると正解が出る', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const ex = page.locator('php-exercise');
  await ex.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('$a = 7; $b = 8; echo $a + $b;');
  await ex.locator('button.run').click();
  await expect(ex.locator('.result')).toContainText('正解', { timeout: 60_000 });
});
