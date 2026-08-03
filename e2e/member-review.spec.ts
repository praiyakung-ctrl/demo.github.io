import { expect, test } from '@playwright/test';
import { seedAuth, seedPdpa } from './helpers';

/* Seeds a single pending CitizenMember directly into localStorage — the
   registration flow itself is already covered by register.spec.ts, so this
   file focuses on the admin review/approve/reject workflow and the
   forced set-password gate that follows approval. */
async function seedPendingMember(page: import('@playwright/test').Page, over: Record<string, unknown> = {}) {
  await page.addInitScript(m => {
    const member = {
      id: 'e2e-member-1',
      nationalId: '3199900000001',
      email: 'e2e.applicant@example.com',
      name: 'สมหญิง รอตรวจสอบ',
      address: '1 ถนนทดสอบ ต.บางปลาสร้อย อ.เมืองชลบุรี',
      province: 'ชลบุรี',
      postalCode: '20000',
      phone: '0899999999',
      memberType: 'ประชาชน',
      purpose: 'ขอภาพเพื่อดำเนินคดี',
      acceptedTerms: true,
      acceptedPdpa: true,
      registeredAt: '2026-08-01T09:00:00.000Z',
      status: 'pending',
      ...m,
    };
    localStorage.setItem('registered_members', JSON.stringify([member]));
  }, over);
}

test('admin approves a pending member, then the member is forced to set a password on next login', async ({ page, context }) => {
  await seedPdpa(page);
  await seedPendingMember(page);
  await seedAuth(page, 'admin');

  await page.goto('admin/member-review');
  await expect(page.getByText('รอตรวจสอบ 1 รายการ')).toBeVisible();

  const row = page.locator('tr', { hasText: 'สมหญิง รอตรวจสอบ' });
  await expect(row.getByText('รอตรวจสอบ', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'อนุมัติ' }).click();

  await expect(page.getByText('รอตรวจสอบ 0 รายการ')).toBeVisible();
  // the row filters out of view once its status stops being "pending"
  // (default filter) — switch to "ทั้งหมด" to see it under its new status
  await page.getByRole('combobox').selectOption('all');
  await expect(row.getByText('อนุมัติ', { exact: true })).toBeVisible();

  const members = await page.evaluate(() => JSON.parse(localStorage.getItem('registered_members') || '[]'));
  expect(members[0].status).toBe('approved');
  expect(members[0].mustChangePassword).toBe(true);
  expect(members[0].reviewedBy).toBeTruthy();

  // simulate the applicant's next login as the AuthContext would build it
  // (loginWithThaId/loginWithGoogle carry mustChangePassword into the session).
  // Use a fresh page in the same browser context (localStorage is shared at
  // the origin level) rather than reusing `page` — `page` still carries the
  // admin auth_user from seedAuth()'s addInitScript, which re-applies on
  // every navigation of that page and would silently overwrite this override.
  const citizenPage = await context.newPage();
  await citizenPage.goto('login');
  await citizenPage.evaluate(() => {
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'e2e-member-1', name: 'สมหญิง รอตรวจสอบ', username: 'e2e.applicant@example.com',
      role: 'citizen', email: 'e2e.applicant@example.com', isActive: true,
      nationalId: '3199900000001', mustChangePassword: true,
    }));
  });

  await citizenPage.goto('portal');
  await citizenPage.waitForURL('**/set-password');
  await expect(citizenPage.getByText('ตั้งรหัสผ่านเข้าใช้งาน')).toBeVisible();

  await citizenPage.fill('#set-pw-new', 'password1234');
  await citizenPage.fill('#set-pw-confirm', 'password1234');
  await citizenPage.click('button[type="submit"]');

  await citizenPage.waitForURL('**/portal');
  const auth = await citizenPage.evaluate(() => JSON.parse(localStorage.getItem('auth_user')!));
  expect(auth.mustChangePassword).toBe(false);
  const membersAfter = await citizenPage.evaluate(() => JSON.parse(localStorage.getItem('registered_members') || '[]'));
  expect(membersAfter[0].mustChangePassword).toBe(false);
});

test('admin rejects a pending member with a required reason', async ({ page }) => {
  await seedPdpa(page);
  await seedPendingMember(page, { id: 'e2e-member-2', nationalId: '3199900000002', name: 'สมศักดิ์ เอกสารไม่ครบ' });
  await seedAuth(page, 'admin');

  await page.goto('admin/member-review');
  const row = page.locator('tr', { hasText: 'สมศักดิ์ เอกสารไม่ครบ' });
  await row.getByRole('button', { name: 'ปฏิเสธ' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('ปฏิเสธใบสมัครสมาชิก')).toBeVisible();
  const confirmButton = dialog.getByRole('button', { name: 'ปฏิเสธ' });
  await expect(confirmButton).toBeDisabled();

  await dialog.locator('#member-reject-reason').fill('เอกสารไม่ครบ กรุณาแนบใหม่');
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await page.getByRole('combobox').selectOption('all');
  await expect(row.getByText('ปฏิเสธ', { exact: true })).toBeVisible();
  const members = await page.evaluate(() => JSON.parse(localStorage.getItem('registered_members') || '[]'));
  const rejected = members.find((m: { id: string }) => m.id === 'e2e-member-2');
  expect(rejected.status).toBe('rejected');
  expect(rejected.rejectionReason).toBe('เอกสารไม่ครบ กรุณาแนบใหม่');
});
