import { expect, test } from '@playwright/test';

/* GitHub Pages SPA fallback: 404.html encodes the deep link into ?/...
   and the index.html inline script decodes it before React Router loads. */
test.describe('SPA deep-link fallback', () => {
  test('?/map decodes to the real route (unauthenticated → /login)', async ({ page }) => {
    await page.goto('?/map');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });

  test('query string survives the decode', async ({ page }) => {
    await page.goto('?/portal&foo=1~and~bar=2');
    await page.waitForURL(url => url.pathname.endsWith('/portal') && url.search === '?foo=1&bar=2');
  });

  test('404.html redirect chain ends inside the app', async ({ page }) => {
    await page.goto('404.html');
    // no deep-link path to decode → lands on "/", which now renders the
    // public home page for guests instead of redirecting to /login
    await page.waitForURL(url => url.pathname.endsWith('/demo.github.io/') || url.pathname.endsWith('/demo.github.io'));
    await expect(page.getByRole('heading', { name: 'กล้องจราจรสาธารณะ' })).toBeVisible();
  });
});
