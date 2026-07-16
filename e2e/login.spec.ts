import { expect, test } from '@playwright/test';
import { seedPdpa } from './helpers';

test.describe('login page', () => {
  test('PDPA banner shows on first visit; decline warns; accept persists', async ({ page }) => {
    await page.goto('login');
    await expect(page.getByText('การคุ้มครองข้อมูลส่วนบุคคล (PDPA)')).toBeVisible();

    await page.getByRole('button', { name: 'ไม่ยอมรับ' }).click();
    await expect(page.getByText('ท่านต้องยอมรับเงื่อนไข')).toBeVisible();

    await page.getByRole('button', { name: 'ยอมรับ', exact: true }).click();
    await expect(page.getByText('การคุ้มครองข้อมูลส่วนบุคคล (PDPA)')).toBeHidden();

    const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('pdpa_consent')!));
    expect(consent.accepted).toBe(true);

    await page.reload();
    await expect(page.getByText('การคุ้มครองข้อมูลส่วนบุคคล (PDPA)')).toBeHidden();
  });

  test('admin login lands on the map', async ({ page }) => {
    await seedPdpa(page);
    await page.goto('login');
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/map');
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('register link is present', async ({ page }) => {
    await seedPdpa(page);
    await page.goto('login');
    await expect(page.getByRole('link', { name: 'สมัครสมาชิกสำหรับประชาชน' })).toBeVisible();
  });
});
