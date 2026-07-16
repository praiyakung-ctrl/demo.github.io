import { expect, test } from '@playwright/test';
import { openCameraPopup, seedAuth, seedPdpa } from './helpers';

const CLUSTER = '(8 กล้อง)'; // Chonburi bridge site containing offline CAM-004

test('offline camera report flow: map → navbar → admin review → resolve', async ({ page }) => {
  await seedPdpa(page);
  await seedAuth(page, 'admin');

  // 1. Offline popup: no Live buttons, report with a note
  await page.goto('map');
  await openCameraPopup(page, 'CAM-004', CLUSTER);
  await expect(page.getByText('กล้องออฟไลน์')).toBeVisible();
  await expect(page.locator('.leaflet-popup-content button', { hasText: 'ดู Live' })).toHaveCount(0);

  await page.getByRole('button', { name: 'แจ้งเจ้าหน้าที่ตรวจสอบ' }).click();
  await page.fill('#report-note', 'ภาพไม่ขึ้น (ทดสอบ E2E)');
  await page.click('button[type="submit"]:has-text("แจ้งเจ้าหน้าที่")');
  await expect(page.getByText('แจ้งเจ้าหน้าที่แล้ว')).toBeVisible();

  // 2. Navbar bell (fresh page mount) shows the repair notification
  await page.goto('dashboard');
  await page.waitForSelector('.recharts-surface');
  await page.click('button[aria-label*="การแจ้งเตือน"]');
  await expect(page.getByText('กล้องรอตรวจสอบ (1)')).toBeVisible();
  await page.getByText('CAM-004 — ภาพไม่ขึ้น (ทดสอบ E2E)').click();

  // 3. Admin review page: resolve the report
  await page.waitForURL('**/admin/repairs');
  await expect(page.getByText('รอตรวจสอบ 1 รายการ')).toBeVisible();
  await page.locator('td button', { hasText: 'ตรวจสอบแล้ว' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'ตรวจสอบแล้ว' }).click();
  await expect(page.getByText('รอตรวจสอบ 0 รายการ')).toBeVisible();

  const reports = await page.evaluate(() => JSON.parse(localStorage.getItem('camera_reports') || '[]'));
  expect(reports[0].status).toBe('resolved');
  expect(reports[0].resolvedAt).toBeTruthy();

  // 4. Camera can be reported again after resolution
  await page.goto('map');
  await openCameraPopup(page, 'CAM-004', CLUSTER);
  await expect(page.getByRole('button', { name: 'แจ้งเจ้าหน้าที่ตรวจสอบ' })).toBeVisible();
});
