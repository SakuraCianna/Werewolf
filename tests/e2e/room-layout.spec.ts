import { expect, test } from '@playwright/test';

test('room layout stays fixed in viewport with an internal status feed', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');

  await expect(page.getByLabel('圆桌座位区')).toBeVisible();
  await expect(page.getByLabel('游戏消息状态区')).toBeVisible();
  await expect(page.getByRole('button', { name: '切换到上帝视角' })).toBeVisible();

  const metrics = await page.evaluate(() => {
    const layout = document.querySelector('.game-layout');
    const main = document.querySelector('.game-main');
    const status = document.querySelector('.status-area');
    const table = document.querySelector('.round-table');
    const messageColors = Array.from(document.querySelectorAll('.message')).map(
      (message) => getComputedStyle(message).color,
    );

    if (!layout || !main || !status || !table) {
      throw new Error('Missing room layout nodes');
    }

    const mainRect = main.getBoundingClientRect();
    const statusRect = status.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();

    return {
      bodyScrollHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      layoutHeight: layout.getBoundingClientRect().height,
      mainWidth: mainRect.width,
      statusWidth: statusRect.width,
      tableTop: tableRect.top,
      tableBottom: tableRect.bottom,
      messageColors,
      hasVisibleSpaceText: document.body.innerText.includes('Space'),
    };
  });

  expect(metrics.bodyScrollHeight).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.htmlOverflow).toBe('hidden');
  expect(metrics.bodyOverflow).toBe('hidden');
  expect(metrics.layoutHeight).toBe(metrics.viewportHeight);
  expect(metrics.mainWidth / metrics.statusWidth).toBeCloseTo(2.5, 0);
  expect(metrics.tableTop).toBeGreaterThanOrEqual(0);
  expect(metrics.tableBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.messageColors).toEqual([
    'rgb(255, 255, 255)',
    'rgb(219, 52, 68)',
    'rgb(69, 219, 52)',
    'rgb(246, 233, 77)',
  ]);
  expect(metrics.hasVisibleSpaceText).toBe(false);
});
