import { expect, test } from '@playwright/test';
import { openCameraPopup, seedAuth, seedPdpa } from './helpers';

const CLUSTER = '(8 กล้อง)'; // Chonburi bridge site containing offline CAM-004
const E2E_NOTE = 'ภาพไม่ขึ้น (ทดสอบ E2E)';

test('offline camera report flow: map → navbar → admin review → resolve', async ({ page }) => {
  await seedPdpa(page);
  await seedAuth(page, 'admin');

  // 1. Offline popup: no Live buttons, report with a note
  //    (CAM-004 has only a resolved seed entry, so it is reportable)
  await page.goto('map');
  await openCameraPopup(page, 'CAM-004', CLUSTER);
  await expect(page.getByText('กล้องออฟไลน์')).toBeVisible();
  await expect(page.locator('.leaflet-popup-content button', { hasText: 'ดู Live' })).toHaveCount(0);

  await page.getByRole('button', { name: 'แจ้งเจ้าหน้าที่ตรวจสอบ' }).click();
  await page.fill('#report-note', E2E_NOTE);
  await page.click('button[type="submit"]:has-text("แจ้งเจ้าหน้าที่")');
  await expect(page.getByText('แจ้งเจ้าหน้าที่แล้ว')).toBeVisible();

  // 2. Navbar bell (fresh page mount) shows the repair notification
  await page.goto('dashboard');
  await page.waitForSelector('.recharts-surface');
  await page.click('button[aria-label*="การแจ้งเตือน"]');
  await expect(page.getByText(/กล้องรอตรวจสอบ \(\d+\)/)).toBeVisible();
  await page.getByText(`CAM-004 — ${E2E_NOTE}`).click();

  // 3. Admin review page: resolve the CAM-004 report (seeded rows co-exist)
  await page.waitForURL('**/admin/repairs');
  const headerBadge = page.getByText(/รอตรวจสอบ \d+ รายการ/);
  const before = Number((await headerBadge.textContent())!.match(/\d+/)![0]);

  const e2eRow = page.locator('tr', { hasText: E2E_NOTE });
  await expect(e2eRow.getByText('รอตรวจสอบ')).toBeVisible();
  await e2eRow.getByRole('button', { name: 'ตรวจสอบแล้ว' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'ตรวจสอบแล้ว' }).click();

  await expect(page.getByText(`รอตรวจสอบ ${before - 1} รายการ`)).toBeVisible();
  await expect(e2eRow.getByText('ตรวจสอบแล้ว')).toBeVisible();

  const reports = await page.evaluate(() => JSON.parse(localStorage.getItem('camera_reports') || '[]'));
  const resolved = reports.find((r: { note?: string }) => r.note === 'ภาพไม่ขึ้น (ทดสอบ E2E)');
  expect(resolved.status).toBe('resolved');
  expect(resolved.resolvedAt).toBeTruthy();

  // 4. Camera can be reported again after resolution
  await page.goto('map');
  await openCameraPopup(page, 'CAM-004', CLUSTER);
  await expect(page.getByRole('button', { name: 'แจ้งเจ้าหน้าที่ตรวจสอบ' })).toBeVisible();
});
