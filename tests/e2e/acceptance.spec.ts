import { test, expect, type Locator } from '@playwright/test';

const T = 60_000;

async function replaceEditor(page: import('@playwright/test').Page, ex: Locator, code: string) {
  await ex.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(code);
}

test('02-arrays 採点ありの演習で正解が出る', async ({ page }) => {
  await page.goto('/lessons/02-arrays.html');
  const ex = page.locator('php-exercise').nth(1); // expected="3"
  await replaceEditor(page, ex, 'echo count(["a","b","c"]);');
  await ex.locator('button.run').click();
  await expect(ex.locator('.result')).toContainText('正解', { timeout: T });
});

test('02-arrays 自由練習は採点されずに実行できる', async ({ page }) => {
  await page.goto('/lessons/02-arrays.html');
  const ex = page.locator('php-exercise').nth(0); // expected なし
  await replaceEditor(page, ex, 'echo array_sum([1,2,3,4]);');
  await ex.locator('button.run').click();
  await expect(ex.locator('.output')).toContainText('10', { timeout: T });
  await expect(ex.locator('.result')).toHaveText('');
});

test('03-functions 採点ありの演習で正解が出る', async ({ page }) => {
  await page.goto('/lessons/03-functions.html');
  const ex = page.locator('php-exercise');
  await replaceEditor(page, ex, 'function double($n){return $n*2;} echo double(5);');
  await ex.locator('button.run').click();
  await expect(ex.locator('.result')).toContainText('正解', { timeout: T });
});

test('01-variables リセットでスターターに戻る', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const ex = page.locator('php-exercise');
  await replaceEditor(page, ex, 'echo 999;');
  await ex.locator('button.reset').click();
  const text = await ex.locator('.cm-content').innerText();
  expect(text).toContain('ここに答えを書く');
  expect(text).not.toContain('999');
});

test('01-variables 模範解答ボタンで答えが入る', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const ex = page.locator('php-exercise');
  await ex.locator('button.solution').click();
  await ex.locator('button.run').click();
  await expect(ex.locator('.result')).toContainText('正解', { timeout: T });
});

test('01-variables 入力はリロード後も保持される', async ({ page }) => {
  await page.goto('/lessons/01-variables.html');
  const ex = page.locator('php-exercise');
  await replaceEditor(page, ex, 'echo 7+8;');
  // onChange による localStorage 保存が走るのを待つ
  await expect(ex.locator('.cm-content')).toContainText('7+8');
  await page.waitForTimeout(500);
  await page.reload();
  const reloaded = page.locator('php-exercise');
  await expect(reloaded.locator('.cm-content')).toContainText('7+8', { timeout: T });
});
