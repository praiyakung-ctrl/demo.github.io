import { expect, test } from '@playwright/test';
import { seedPdpa } from './helpers';

const TEST_EMAIL = 'otp.e2e@example.com';

/* 1x1 transparent PNG, inlined so this test needs no fixture file on disk */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('foreigner registration: OTP email verification gates progress to the profile form', async ({ page }) => {
  await seedPdpa(page);
  await page.goto('register/foreigner');
  await expect(page.getByText('เริ่มต้นสมัครสมาชิก')).toBeVisible();

  // mock Google verification runs after a short delay
  await page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' }).click();
  await expect(page.getByText('ยืนยันอีเมลด้วยรหัส OTP')).toBeVisible({ timeout: 5000 });

  // "ถัดไป" stays disabled until the email is OTP-verified (and passport attached)
  await expect(page.getByRole('button', { name: 'ถัดไป' })).toBeDisabled();

  await page.fill('#otp-email', TEST_EMAIL);
  await page.getByRole('button', { name: 'ส่งรหัสยืนยัน (OTP)' }).click();

  // the e2e preview server's origin doesn't match the Worker's configured
  // ALLOWED_ORIGIN, so the send is rejected and the dev-mode code fallback
  // renders inline — assert on that rather than a real inbox
  const devCodeBlock = page.getByText('ไม่สามารถส่งอีเมลได้ในขณะนี้');
  await expect(devCodeBlock).toBeVisible({ timeout: 5000 });
  const codeText = await page.locator('span.font-mono.font-bold').innerText();
  expect(codeText).toMatch(/^\d{6}$/);

  // wrong code is rejected
  await page.fill('#otp-code', '000000');
  await page.getByRole('button', { name: 'ยืนยันรหัส' }).click();
  await expect(page.getByText('รหัสไม่ถูกต้อง')).toBeVisible();

  await page.fill('#otp-code', codeText);
  await page.getByRole('button', { name: 'ยืนยันรหัส' }).click();
  await expect(page.getByText(`ยืนยันอีเมล ${TEST_EMAIL} เรียบร้อยแล้ว`)).toBeVisible();

  await page.setInputFiles('#passport-scan-input', { name: 'passport.png', mimeType: 'image/png', buffer: TINY_PNG });
  await expect(page.getByRole('button', { name: 'ถัดไป' })).toBeEnabled();
  await page.getByRole('button', { name: 'ถัดไป' }).click();

  await expect(page.getByText('กรอกข้อมูลสมาชิก')).toBeVisible();
  await expect(page.locator('#reg-email-ro')).toHaveValue(TEST_EMAIL);

  await page.fill('#reg-passport', 'E88888888');
  await page.fill('#reg-nationality', 'จีน');
  await page.fill('#reg-address', '1 ถนนทดสอบ ต.บางปลาสร้อย อ.เมืองชลบุรี');
  await page.selectOption('#reg-province', 'ชลบุรี');
  await page.fill('#reg-postal', '20000');
  await page.fill('#reg-phone', '0899999999');
  await page.selectOption('#reg-type', 'ประชาชน');
  await page.selectOption('#reg-purpose', 'ขอภาพเพื่อดำเนินคดี');
  for (const box of await page.locator('input[type="checkbox"]').all()) await box.check();
  await page.click('button[type="submit"]');

  await expect(page.getByText('ส่งใบสมัครเรียบร้อยแล้ว')).toBeVisible();

  const members = await page.evaluate(() => JSON.parse(localStorage.getItem('registered_members') || '[]'));
  expect(members).toHaveLength(1);
  expect(members[0].email).toBe(TEST_EMAIL);
  expect(members[0].status).toBe('pending');
  expect(members[0].authType).toBe('google');
});
