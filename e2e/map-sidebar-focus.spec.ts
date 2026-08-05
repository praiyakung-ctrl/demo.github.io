import { expect, test } from '@playwright/test';
import { seedAuth, seedPdpa } from './helpers';

// regression test: clicking a camera in the left sidebar list used to only re-center the
// map without opening that camera's own popup, so if a different (often nearby) camera's
// popup was already open it stayed open and looked like the wrong camera was focused.
// focusCamera() in MapPage.tsx now explicitly opens the clicked camera's own popup.
test('clicking a camera in the sidebar list opens that camera\'s own popup', async ({ page }) => {
  await seedPdpa(page);
  await seedAuth(page, 'admin');

  await page.goto('map');
  await page.waitForSelector('.leaflet-container');
  await page.waitForTimeout(2000);

  const toggle = page.getByLabel('แสดงรายการกล้อง');
  if (await toggle.isVisible().catch(() => false)) await toggle.click();

  const searchBox = page.getByPlaceholder('ค้นหากล้อง...');
  await searchBox.fill('CAM-017');

  const listItem = page.locator('button', { hasText: 'CAM-017' }).first();
  await expect(listItem).toBeVisible();
  await listItem.click();

  const popup = page.locator('.leaflet-popup');
  await expect(popup).toBeVisible({ timeout: 5000 });
  await expect(popup).toContainText('CAM-017');
});
