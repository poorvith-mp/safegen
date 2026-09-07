import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Use an existing Playwright installation; this does not add a production dependency.
const modulePath = process.env.SAFEGEN_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const { expect } = await import(modulePath ? new URL('./test.mjs', pathToFileURL(modulePath)).href : 'playwright/test');
const target = process.env.SAFEGEN_TEST_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, ...(process.env.SAFEGEN_BROWSER_CHANNEL ? { channel: process.env.SAFEGEN_BROWSER_CHANNEL } : {}) });
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(10_000);
const errors = [];
const unauthorized = [];
const failedRequests = [];
const consoleErrors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
context.on('requestfailed', request => failedRequests.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
context.on('request', request => {
  const url = new URL(request.url());
  if (url.origin !== new URL(target).origin && !['data:', 'blob:'].includes(url.protocol)) unauthorized.push(url.origin);
});
const generated = () => page.getByRole('status', { name: /Generated .* credential/ }).locator('div').first();
const key = 'safegen-history-vault';

try {
  await page.goto(target);
  await page.getByRole('button', { name: 'Copy generated credential' }).waitFor();
  assert.equal((await generated().innerText()).length, 16);
  await page.evaluate(() => navigator.serviceWorker.ready.then(registration => {
    if (registration.active?.state === 'activated') return;
    return new Promise(resolve => registration.active?.addEventListener('statechange', resolve, { once: true }));
  }));

  // A first visit must cache its JS/CSS too, before any controlled reload.
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Copy generated credential' }).waitFor();
  assert.equal((await generated().innerText()).length, 16);
  await context.setOffline(false);

  await page.getByRole('button', { name: /PIN Code/ }).click();
  await expect(generated()).toHaveText(/^\d{6}$/);
  await page.getByLabel('PIN Digits Length').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(generated()).toHaveText(/^\d{8}$/);
  await page.getByRole('button', { name: /Passphrase Memorable/ }).click();
  await expect(generated()).toHaveText(/.{11,}/);
  await page.getByRole('button', { name: /Pattern Custom/ }).click();
  await expect(generated()).toHaveText(/^[A-Z]\d{3}-[A-Z]\d{3}-.+$/);
  await page.getByRole('button', { name: /Random High/ }).click();
  for (const name of ['Uppercase (A-Z)', 'Lowercase (a-z)', 'Numbers (0-9)', 'Symbols (!@#$)']) await page.getByLabel(name, { exact: true }).uncheck();
  await page.waitForFunction(() => document.querySelector('[aria-label="Copy generated credential"]')?.disabled);
  assert.equal(await page.getByRole('button', { name: 'Copy generated credential' }).isDisabled(), true);
  await page.getByText('Choose at least one character set to generate a password.').waitFor();
  await page.getByLabel('Lowercase (a-z)', { exact: true }).check();
  await expect(generated()).toHaveText(/^[a-z]{16}$/);

  // Copy from a focused button with Space must activate that button, not the global generate shortcut.
  const before = await generated().innerText();
  await page.getByRole('button', { name: 'Copy generated credential' }).focus();
  await page.keyboard.press('Space');
  await page.getByText('Password copied to clipboard', { exact: true }).waitFor();
  assert.equal(await generated().innerText(), before);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'Keep history on this device' }).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? '[]').length === 1, key);
  await page.reload();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByText(/Stored history found \(1\)/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Export JSON', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Load and keep it' }).click();
  await expect(page.getByRole('button', { name: 'Export JSON', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Delete stored copy' }).click();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);

  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByText('Unreadable stored history found.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '{broken');
  await page.getByRole('button', { name: 'Delete stored copy' }).click();

  await page.getByRole('button', { name: 'Docs', exact: true }).click();
  const docs = await page.locator('main').innerText();
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Space');
  assert.equal(await page.locator('main').innerText(), docs);
  assert.match(docs, /owner|broker/i);

  // Exercise browser failure paths with synthetic state in this isolated test profile.
  await page.getByRole('button', { name: 'Generator', exact: true }).click();
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new Error('test denial'); };
    document.execCommand = () => false;
  });
  await page.getByRole('button', { name: 'Copy generated credential' }).click();
  await page.getByText('Clipboard permission was denied', { exact: true }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(unauthorized, []);
  console.log('Browser smoke passed: four modes, empty selection, keyboard copy, opt-in history, corrupt storage, clipboard denial, first-visit offline reload, mobile layout, zero page errors and zero unauthorized network requests.');
} catch (error) {
  console.error('Overflow elements:', await page.evaluate(() => [...document.querySelectorAll('*')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => ({ tag: element.tagName, class: element.className, width: element.getBoundingClientRect().width })).slice(0, 12)).catch(() => []));
  console.error('Browser errors:', errors);
  console.error('Console errors:', consoleErrors);
  console.error('Failed requests:', failedRequests);
  console.error('Page title:', await page.title().catch(() => 'Navigation did not finish'));
  console.error('Cached assets:', await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => {
    const cache = await caches.open(key);
    return Promise.all((await cache.keys()).map(async request => ({ path: new URL(request.url).pathname, vary: (await cache.match(request))?.headers.get('vary') })));
  }))).flat()).catch(() => []));
  throw error;
} finally {
  await browser.close();
}
