import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;
const historical = page => page.getByLabel('Historical / Already Used Domains');
const candidates = page => page.getByLabel('Domains to Check', { exact: true });
const check = page => page.getByRole('button', { name: 'Check Domains' }).click();
const rows = page => page.getByRole('table', { name: 'Candidate domains' }).locator('tbody tr');

test('runs standalone, shows each status, filters results, and exports the active comparison', async ({ page, context }) => {
  const requests = [];
  const errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await context.setOffline(true);
  await page.goto(appUrl);
  await historical(page).fill('example.com\nnot a domain\nexample.co.uk');
  await candidates(page).fill('https://www.example.com/page\nexample.net\nEXAMPLE.NET/a\nhttps://bücher.de/?a=b\n=1+1\n<script>alert(1)</script>');
  await check(page);

  await expect(page.getByText('Skipped 1 invalid historical line (2).', { exact: false })).toBeVisible();
  await expect(rows(page)).toHaveCount(6);
  await expect(rows(page).filter({ hasText: 'https://www.example.com/page' })).toContainText('Already Used');
  await expect(rows(page).filter({ hasText: '<script>alert(1)</script>' })).toContainText('Invalid');
  await expect(page.locator('#count-new')).toHaveText('2');
  await expect(page.locator('#count-invalid')).toHaveText('2');

  await page.getByLabel('Status', { exact: true }).selectOption('new');
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole('searchbox').fill('xn--bcher-kva');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('xn--bcher-kva.de');

  const [newDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download New Domains CSV' }).click(),
  ]);
  expect(newDownload.suggestedFilename()).toBe('new-domains.csv');
  expect(await readFile(await newDownload.path(), 'utf8')).toBe('\uFEFF"Domain"\r\n"example.net"\r\n"xn--bcher-kva.de"\r\n');

  const [allDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download Results CSV' }).click(),
  ]);
  const csv = await readFile(await allDownload.path(), 'utf8');
  expect(csv).toContain('"https://www.example.com/page","example.com","Already Used"');
  expect(csv).toContain(`"'=1+1","","Invalid"`);
  expect(csv.split('\r\n')).toHaveLength(8);
  expect(requests.filter(url => /^(https?|wss?):/i.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test('paginates large results and invalidates the comparison when a list changes', async ({ page }) => {
  await page.goto(appUrl);
  const list = Array.from({ length: 5000 }, (_, i) => `site-${i}.example.net`).join('\n');
  // Replace the field value in one operation to avoid simulating thousands of edits.
  await candidates(page).evaluate((field, value) => {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }, list);
  await check(page);
  await expect(rows(page)).toHaveCount(50);
  await expect(page.getByText('Showing 1–50 of 5000 entries.')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Showing 51–100 of 5000 entries.')).toBeVisible();
  await page.getByRole('searchbox').fill('site-4999');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('site-4999.example.net');
  await candidates(page).fill('example.org');
  await expect(page.getByRole('button', { name: 'Download Results CSV' })).toBeHidden();
  await expect(page.getByText('The lists changed.', { exact: false })).toBeVisible();
  await check(page);
  await expect(rows(page)).toContainText('example.org');
});

test('handles empty inputs, clipboard denial, clear, and reload without saving input', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } },
    });
  });
  await page.goto(appUrl);
  await check(page);
  await expect(page.getByText('Paste at least one domain or URL to check.')).toBeVisible();
  await expect(candidates(page)).toBeFocused();

  await historical(page).fill('not a domain');
  await candidates(page).fill('example.org');
  await check(page);
  await expect(page.getByText('The historical list contains no valid domains.', { exact: false })).toBeVisible();
  await expect(historical(page)).toBeFocused();

  await historical(page).fill('example.net');
  await candidates(page).fill('example.org\nhttps://example.org/\nexample.net');
  await check(page);
  await page.getByRole('button', { name: 'Copy New Domains' }).click();
  await expect(page.getByLabel('Select and copy these new domains')).toHaveValue('example.org');
  await expect(page.getByLabel('Select and copy these new domains')).toBeFocused();

  expect(await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: (await indexedDB.databases()).length,
  }))).toEqual({ local: 0, session: 0, databases: 0 });
  expect(await context.cookies()).toEqual([]);

  await page.getByRole('button', { name: 'Clear All' }).click();
  await expect(historical(page)).toHaveValue('');
  await expect(candidates(page)).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Comparison results' })).toBeHidden();
  await expect(historical(page)).toBeFocused();

  await candidates(page).fill('example.com');
  await check(page);
  await page.reload();
  await expect(candidates(page)).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Comparison results' })).toBeHidden();
});

test('uses the clipboard when available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async text => { document.documentElement.dataset.copied = text; } },
    });
  });
  await page.goto(appUrl);
  await candidates(page).fill('example.org\nhttps://example.org/\nexample.com');
  await check(page);
  await page.getByRole('button', { name: 'Copy New Domains' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied', 'example.org\nexample.com');
  await expect(page.getByText('New domains copied to the clipboard.')).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`results are accessible and fit the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(appUrl);
    await historical(page).fill('example.com');
    await candidates(page).fill('https://www.example.com/a\nexample.net\nnot a domain');
    await check(page);
    await expect(rows(page)).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const tableRegion = page.getByRole('region', { name: 'Domain results table' });
    expect(await tableRegion.evaluate(element => element.scrollWidth)).toBe(
      await tableRegion.evaluate(element => element.clientWidth),
    );
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  });
}
