import { expect, test } from '@playwright/test';
import { seedAuth, seedPdpa } from './helpers';

test.describe('CctvEventsReportPage + daily-events drilldown', () => {
  test.beforeEach(async ({ page }) => {
    await seedPdpa(page);
    await seedAuth(page, 'admin');
  });

  test('shows all events and filters by สภ.', async ({ page }) => {
    await page.goto('reports/events');
    await expect(page.getByRole('heading', { name: 'รายงานเหตุการณ์ CCTV' })).toBeVisible();
    await expect(page.getByText('พบ 170 / 170 รายการ')).toBeVisible();

    await page.getByLabel('กรองตามสภ.').selectOption({ label: 'สภ.ศรีราชา' });
    const filteredText = await page.locator('text=/พบ \\d+ \\/ 170 รายการ/').textContent();
    const count = Number(filteredText?.match(/พบ (\d+)/)?.[1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(170);
  });

  // regression test: clicking a day/category count in the daily chart used to link to
  // /reports/events with a mismatched count, because the daily numbers were fabricated
  // from a different data source than events.json. dailyBreakdownFromEvents() now derives
  // both pages from the same real records, so the clicked count must match exactly.
  test('drilldown from daily events lands on a matching event count', async ({ page }) => {
    await page.goto('reports/daily-events?month=1');
    await expect(page.getByRole('heading', { name: 'เหตุการณ์ CCTV รายวัน' })).toBeVisible();

    const firstCountButton = page.locator('table').first().locator('tbody button').first();
    await expect(firstCountButton).toBeVisible({ timeout: 10000 });
    const clickedCount = (await firstCountButton.textContent())?.trim();

    await firstCountButton.click();
    await page.waitForURL('**/reports/events**');

    const resultText = await page.locator('text=/พบ \\d+ \\/ 170 รายการ/').textContent();
    expect(resultText?.match(/พบ (\d+)/)?.[1]).toBe(clickedCount);
  });
});
