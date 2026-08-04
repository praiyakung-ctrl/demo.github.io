import { expect, test } from '@playwright/test';
import { seedAuth, seedPdpa } from './helpers';

const TINY_FILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function seedRequestAwaitingVideo(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const req = {
      id: 'e2e-video-req',
      reqNo: 'REQ-260101-9001',
      citizenName: 'ผู้ร้องขอ วีดีโอ',
      idCard: '3199900009999',
      phone: '0899999999',
      email: 'video.requester@example.com',
      incidentLat: 13.3672,
      incidentLng: 100.9838,
      incidentLocation: 'บริเวณทดสอบ',
      assignedCameraIds: [],
      startDatetime: '2026-05-20T12:00:00',
      endDatetime: '2026-05-20T13:00:00',
      purpose: 'อุบัติเหตุ',
      description: 'ทดสอบดาวน์โหลดวิดีโอ',
      status: 'รอภาพ',
      submittedAt: '2026-05-20T10:15:00',
      timeline: [
        { step: 'รับคำขอ', timestamp: '2026-05-20T10:15:00', completed: true },
        { step: 'ตรวจสอบข้อมูล', timestamp: '2026-05-20T10:16:00', completed: true },
        { step: 'พิจารณาอนุมัติ', timestamp: '2026-05-20T10:17:00', completed: true },
        { step: 'จัดเตรียมข้อมูล', timestamp: '2026-05-20T10:18:00', completed: true },
        { step: 'ส่งข้อมูล', completed: false },
      ],
    };
    localStorage.setItem('citizen_requests', JSON.stringify([req]));
  });
}

test('admin adds multiple video links; citizen auto-logs in via magic link and downloads each, logging every download', async ({ page, context }) => {
  await seedPdpa(page);
  await seedRequestAwaitingVideo(page);
  await seedAuth(page, 'admin');

  await page.goto('portal');
  await expect(page.getByRole('heading', { name: 'REQ-260101-9001' })).toBeVisible();
  await page.getByRole('button', { name: 'ส่งข้อมูลแล้ว' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('จัดการลิงก์วิดีโอ')).toBeVisible();

  // first link: default 90-day expiry
  await dialog.locator('#video-file-input').setInputFiles({ name: 'clip1.mp4', mimeType: 'video/mp4', buffer: TINY_FILE });
  await dialog.getByRole('button', { name: 'เพิ่มลิงก์' }).click();
  await expect(dialog.getByText('clip1.mp4')).toBeVisible();

  // second link: 1-year expiry
  await dialog.locator('#video-expiry').selectOption('365');
  await dialog.locator('#video-file-input').setInputFiles({ name: 'clip2.mp4', mimeType: 'video/mp4', buffer: TINY_FILE });
  await dialog.getByRole('button', { name: 'เพิ่มลิงก์' }).click();
  await expect(dialog.getByText('clip2.mp4')).toBeVisible();

  await dialog.getByRole('button', { name: 'บันทึกและแจ้งเตือนผู้ร้องขอ' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('span.inline-flex.items-center.rounded-xl', { hasText: 'ส่งแล้ว' }).first()).toBeVisible();

  const afterSend = await page.evaluate(() => JSON.parse(localStorage.getItem('citizen_requests') || '[]'));
  expect(afterSend[0].videoLinks).toHaveLength(2);
  expect(afterSend[0].downloadToken).toBeTruthy();
  const token = afterSend[0].downloadToken as string;

  // simulate clicking the magic-link button in the video-ready email, from a
  // browser with no prior session (fresh page in the same context — localStorage
  // is shared at the origin level, but this page has no auth_user set yet)
  const citizenPage = await context.newPage();
  await citizenPage.goto(`video-access?token=${token}`);
  await citizenPage.waitForURL('**/portal');

  const auth = await citizenPage.evaluate(() => JSON.parse(localStorage.getItem('auth_user') || 'null'));
  expect(auth?.role).toBe('citizen');
  expect(auth?.email).toBe('video.requester@example.com');

  await citizenPage.getByRole('button', { name: /REQ-260101-9001/ }).click();
  await expect(citizenPage.getByText('ไฟล์วิดีโอพร้อมดาวน์โหลด (2 ไฟล์)')).toBeVisible();

  const downloadButtons = citizenPage.getByRole('button', { name: 'ดาวน์โหลด' });
  await downloadButtons.first().click();
  await expect(citizenPage.getByText('กำลังดาวน์โหลด...')).toBeVisible();
  await expect(citizenPage.getByText('กำลังดาวน์โหลด...')).toBeHidden({ timeout: 5000 });

  await downloadButtons.first().click();
  await expect(citizenPage.getByText('กำลังดาวน์โหลด...')).toBeHidden({ timeout: 5000 });

  const afterDownload = await citizenPage.evaluate(() => JSON.parse(localStorage.getItem('citizen_requests') || '[]'));
  expect(afterDownload[0].status).toBe('ได้รับแล้ว');

  const auditLogs = await citizenPage.evaluate(() => JSON.parse(localStorage.getItem('audit_logs') || '[]'));
  const downloadLogs = auditLogs.filter((l: { detail: string }) => l.detail.includes('ดาวน์โหลดไฟล์วิดีโอ'));
  expect(downloadLogs.length).toBeGreaterThanOrEqual(2);
});
