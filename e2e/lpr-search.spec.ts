import { expect, test } from '@playwright/test';
import { seedAuth, seedPdpa } from './helpers';

test.describe('LprSearchPage', () => {
  test.beforeEach(async ({ page }) => {
    await seedPdpa(page);
    await seedAuth(page, 'admin');
  });

  test('reachable from /reports and searches a plate with multiple hits', async ({ page }) => {
    await page.goto('reports');
    await page.getByRole('link', { name: 'ค้นหาป้ายทะเบียน LPR' }).click();
    await page.waitForURL('**/reports/lpr');
    await expect(page.getByRole('heading', { name: 'ค้นหาป้ายทะเบียน LPR' })).toBeVisible();

    await page.getByLabel('ค้นหาป้ายทะเบียน').fill('ปถ 0134');
    await expect(page.getByRole('heading', { name: 'ผลการค้นหา : ปถ 0134' })).toBeVisible();

    const badgeText = await page.locator('span.bg-navy-700').first().textContent();
    const count = Number(badgeText?.match(/\d+/)?.[0]);
    expect(count).toBeGreaterThan(1);
  });

  test('top 2 example rows show the real sample photos', async ({ page }) => {
    await page.goto('reports/lpr');

    const row1 = page.locator('tbody tr').nth(0);
    const row2 = page.locator('tbody tr').nth(1);

    await expect(row1.locator('td').nth(2)).toContainText('กข 456');
    await expect(row1.locator('img')).toHaveAttribute('src', /LPR-Car-456-chon\.png/);

    await expect(row2.locator('td').nth(2)).toContainText('ขข 1234');
    await expect(row2.locator('img')).toHaveAttribute('src', /LPR-Car-123\.png/);
  });
});
