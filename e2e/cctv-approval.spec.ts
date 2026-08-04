import { expect, test } from '@playwright/test';
import { seedPdpa } from './helpers';

/* Default seed in src/utils/cctvApprovers.ts: level1 = users '2'/'4',
   level2 = users '5'/'6', level3 = users '3'/'10' (see src/data/users.json). */
const LEVEL1_APPROVER = { id: '2', name: 'วิภา ควบคุม', role: 'operator' };
const LEVEL2_APPROVER = { id: '5', name: 'มณี ควบคุม', role: 'operator' };
const LEVEL3_APPROVER = { id: '3', name: 'ธนา บริหาร', role: 'executive' };
const NON_APPROVER = { id: '999', name: 'ไม่มีสิทธิ์อนุมัติ', role: 'operator' };

async function seedRequest(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const req = {
      id: 'e2e-req-1',
      reqNo: 'REQ-2026-E2E',
      citizenName: 'ทดสอบ อีทูอี',
      idCard: '1-2345-67890-12-3',
      phone: '0899999999',
      email: 'e2e.requester@example.com',
      incidentLat: 13.3672,
      incidentLng: 100.9838,
      incidentLocation: 'บริเวณทดสอบ',
      assignedCameraIds: [],
      startDatetime: '2026-05-20T12:00:00',
      endDatetime: '2026-05-20T13:00:00',
      purpose: 'อุบัติเหตุ',
      description: 'ทดสอบระบบอนุมัติ 3 ระดับ',
      status: 'รอดำเนินการ',
      submittedAt: '2026-05-20T10:15:00',
      timeline: [
        { step: 'รับคำขอ', timestamp: '2026-05-20T10:15:00', completed: true },
        { step: 'ตรวจสอบข้อมูล', timestamp: '2026-05-20T10:16:00', completed: true },
        { step: 'พิจารณาอนุมัติ', completed: false },
        { step: 'จัดเตรียมข้อมูล', completed: false },
        { step: 'ส่งข้อมูล', completed: false },
      ],
    };
    localStorage.setItem('citizen_requests', JSON.stringify([req]));
  });
}

async function loginAs(page: import('@playwright/test').Page, approver: { id: string; name: string; role: string }) {
  await page.addInitScript(a => {
    localStorage.setItem('auth_user', JSON.stringify({
      id: a.id, name: a.name, username: a.id, role: a.role, email: `${a.id}@chonburi.go.th`, isActive: true,
    }));
  }, approver);
}

test('CCTV request approval requires all 3 levels in order, gated to designated approvers', async ({ page, context }) => {
  await seedPdpa(page);
  await seedRequest(page);

  // a staff member who isn't a level-1 approver must not see approve/reject buttons
  await loginAs(page, NON_APPROVER);
  await page.goto('portal');
  await expect(page.getByRole('heading', { name: 'REQ-2026-E2E' })).toBeVisible();
  await expect(page.getByText('รอผู้อนุมัติระดับ 1')).toBeVisible();
  await expect(page.getByRole('button', { name: /^อนุมัติ/ })).toHaveCount(0);

  // level-1 approver approves -> moves to level 2
  const level1Page = await context.newPage();
  await seedPdpa(level1Page);
  await loginAs(level1Page, LEVEL1_APPROVER);
  await level1Page.goto('portal');
  await expect(level1Page.getByRole('heading', { name: 'REQ-2026-E2E' })).toBeVisible();
  await level1Page.getByRole('button', { name: /อนุมัติ \(ระดับ 1/ }).click();
  await expect(level1Page.locator('span.inline-flex.items-center.rounded-xl', { hasText: 'รอหัวหน้างานอนุมัติ' }).first()).toBeVisible();

  let requests = await level1Page.evaluate(() => JSON.parse(localStorage.getItem('citizen_requests') || '[]'));
  expect(requests[0].status).toBe('รอหัวหน้างานอนุมัติ');
  expect(requests[0].approvals).toHaveLength(1);
  expect(requests[0].approvals[0]).toMatchObject({ level: 1, decision: 'approved', approverId: '2' });

  // level-2 approver approves -> moves to level 3
  const level2Page = await context.newPage();
  await seedPdpa(level2Page);
  await loginAs(level2Page, LEVEL2_APPROVER);
  await level2Page.goto('portal');
  await expect(level2Page.getByRole('heading', { name: 'REQ-2026-E2E' })).toBeVisible();
  await level2Page.getByRole('button', { name: /อนุมัติ \(ระดับ 2/ }).click();
  await expect(level2Page.locator('span.inline-flex.items-center.rounded-xl', { hasText: 'รอผู้บริหารอนุมัติ' }).first()).toBeVisible();

  // level-3 approver rejects -> terminal state, reason required
  const level3Page = await context.newPage();
  await seedPdpa(level3Page);
  await loginAs(level3Page, LEVEL3_APPROVER);
  await level3Page.goto('portal');
  await expect(level3Page.getByRole('heading', { name: 'REQ-2026-E2E' })).toBeVisible();
  await level3Page.getByRole('button', { name: 'ปฏิเสธ' }).click();

  const dialog = level3Page.getByRole('dialog');
  const confirmButton = dialog.getByRole('button', { name: 'ปฏิเสธคำขอ' });
  await expect(confirmButton).toBeDisabled();
  await dialog.locator('#reject-reason').fill('เอกสารไม่เพียงพอต่อการอนุมัติขั้นสุดท้าย');
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect(level3Page.getByText('ปฏิเสธคำขอ').first()).toBeVisible();
  requests = await level3Page.evaluate(() => JSON.parse(localStorage.getItem('citizen_requests') || '[]'));
  expect(requests[0].status).toBe('ปฏิเสธ');
  expect(requests[0].rejectionReason).toBe('เอกสารไม่เพียงพอต่อการอนุมัติขั้นสุดท้าย');
  expect(requests[0].approvals).toHaveLength(3);
  expect(requests[0].approvals[2]).toMatchObject({ level: 3, decision: 'rejected', approverId: '3' });
});
