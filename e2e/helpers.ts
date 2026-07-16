import type { Page } from '@playwright/test';

/* Seed PDPA consent so the banner doesn't block interactions */
export async function seedPdpa(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('pdpa_consent', JSON.stringify({ accepted: true, date: new Date().toISOString() }));
  });
}

/* Seed a logged-in session without going through the login form */
export async function seedAuth(page: Page, role: 'admin' | 'operator' | 'executive' | 'citizen' = 'admin'): Promise<void> {
  await page.addInitScript(r => {
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'e2e-user', name: 'ผู้ทดสอบ E2E', username: r, role: r, email: 'e2e@test.local', isActive: true,
    }));
  }, role);
}

/* Map markers overlap and cluster markers intercept pointer events —
   dispatchEvent bypasses hit-testing (same approach as manual verification) */
export async function openCameraPopup(page: Page, camId: string, clusterTitle: string): Promise<void> {
  await page.waitForSelector('.leaflet-container');
  await page.waitForTimeout(2500);
  await page.locator(`.leaflet-marker-icon[title*="${clusterTitle}"]`).first().dispatchEvent('click');
  await page.waitForTimeout(1500);
  await page.locator(`.leaflet-marker-icon[title^="${camId}"]`).first().dispatchEvent('click');
}
