import { expect, test } from '@playwright/test';
import { seedPdpa } from './helpers';

test('citizen registration via simulated Google OAuth', async ({ page }) => {
  await seedPdpa(page);
  await page.goto('register');
  await expect(page.getByText('เริ่มต้นสมัครสมาชิก')).toBeVisible();

  await page.getByRole('button', { name: 'สมัครสมาชิกด้วย Google' }).click();
  await expect(page.getByText('กรอกข้อมูลสมาชิก')).toBeVisible();

  // Google fields are prefilled and readonly
  await expect(page.locator('#reg-email')).toHaveValue(/@gmail\.com$/);
  await expect(page.locator('#reg-email')).toHaveAttribute('readonly', '');
  await expect(page.locator('#reg-sub')).toHaveValue(/^\d+$/);

  await page.fill('#reg-name', 'สมชาย ใจดี');
  await page.fill('#reg-address', '99 หมู่ 1 ต.บ้านสวน อ.เมืองชลบุรี');
  await page.selectOption('#reg-province', 'ชลบุรี');
  await page.fill('#reg-postal', '20000');
  await page.fill('#reg-phone', '0812345678');
  await page.selectOption('#reg-type', 'ประชาชน');
  await page.selectOption('#reg-purpose', 'ขอภาพเพื่อดำเนินคดี');

  // consent checkboxes are required — submit without them stays on the form
  await page.click('button[type="submit"]');
  await expect(page.getByText('กรอกข้อมูลสมาชิก')).toBeVisible();

  for (const box of await page.locator('input[type="checkbox"]').all()) await box.check();
  await page.click('button[type="submit"]');
  await expect(page.getByText('สมัครสมาชิกเรียบร้อยแล้ว')).toBeVisible();

  const members = await page.evaluate(() => JSON.parse(localStorage.getItem('registered_members') || '[]'));
  expect(members).toHaveLength(1);
  expect(members[0].name).toBe('สมชาย ใจดี');
  expect(members[0].acceptedTerms).toBe(true);
  expect(members[0].acceptedPdpa).toBe(true);

  // enter the system → auto-login as citizen → portal
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/portal');
  const auth = await page.evaluate(() => JSON.parse(localStorage.getItem('auth_user')!));
  expect(auth.role).toBe('citizen');
  expect(auth.name).toBe('สมชาย ใจดี');
});
