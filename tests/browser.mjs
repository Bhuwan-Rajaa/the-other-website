import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const browser = process.env.BROWSER_CDP_URL
  ? await chromium.connectOverCDP(process.env.BROWSER_CDP_URL)
  : await chromium.launch({ channel: 'chrome', headless: true });
const issues = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => issues.push(error.message));
  await page.goto(base);
  await page.getByRole('heading', { name: 'Back to us.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Come on in' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Explore the sample preview' }).click();
  await page.getByRole('heading', { name: 'A little life, together.' }).waitFor();
  await page.locator('.hero-card').waitFor();
  await fs.mkdir('.qa', { recursive: true });
  await page.screenshot({ path: '.qa/home-desktop.png', fullPage: true });
  // Required fields are short; preview cannot pretend that a save succeeded.
  await page.locator('.topbar-add').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What shall we call it?').fill('A test moment');
  assert.equal(await dialog.getByLabel('Photos (optional)').count(), 1);
  assert.equal(await dialog.getByRole('button', { name: 'Save our moment' }).isDisabled(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.locator('.desktop-nav').getByRole('link', { name: 'Our calendar' }).click();
  await page.getByRole('heading', { name: 'Our calendar.' }).waitFor();
  assert.equal(await page.locator('.calendar-day').count(), 42);
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.locator('.calendar-day').nth(15).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').getByRole('button', { name: 'Plan a date' }).click();
  await page.getByRole('dialog').getByText('Make time for us').waitFor();
  assert.equal(await page.getByRole('dialog').locator('select[name="status"]').inputValue(), 'planned');
  await page.keyboard.press('Escape');
  await page.locator('.desktop-nav').getByRole('link', { name: 'Our memories' }).click();
  await page.getByRole('heading', { name: 'Our scrapbook.' }).waitFor();
  await page.getByRole('textbox', { name: 'Search memory titles' }).fill('no-such-moment');
  await page.getByRole('heading', { name: 'No moments on this page yet' }).waitFor();
  await page.getByRole('textbox', { name: 'Search memory titles' }).fill('Coffee');
  assert.equal(await page.locator('.memory-card').count(), 1);
  await page.locator('.memory-card').click();
  await page.getByRole('heading', { name: 'Coffee & all the little things' }).waitFor();
  await page.getByRole('heading', { name: 'Hear this moment again' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Record a note' }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Upload audio' }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Add photos', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Take photo', exact: true }).isDisabled(), true);
  await page.setViewportSize({ width: 320, height: 720 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Memory media controls overflow at 320px');
  await page.setViewportSize({ width: 1440, height: 1050 });
  assert.equal(await page.getByRole('textbox', { name: 'Bhuwan’s point of view' }).count(), 1);
  assert.equal(await page.getByRole('textbox', { name: 'Pooja’s point of view' }).count(), 0);
  await page.getByRole('button', { name: 'Delete memory', exact: true }).click();
  assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Delete permanently' }).isDisabled(), true);
  await page.keyboard.press('Escape');
  await page.locator('.desktop-nav').getByRole('link', { name: 'My little corner' }).click();
  await page.getByRole('button', { name: 'View as Pooja' }).click();
  await page.getByRole('heading', { name: 'Hello, Pooja.' }).waitFor();
  await page.locator('.desktop-nav').getByRole('link', { name: 'Our milestones' }).click();
  await page.getByText('August 14. Always ours.').waitFor();
  await page.getByText('The day we met', { exact: true }).waitFor();
  // Check all major pages and modal fit at the minimum supported phone width.
  await page.setViewportSize({ width: 320, height: 720 });
  for (const [label, title] of [['Home', 'A little life, together.'], ['Calendar', 'Our calendar.'], ['Memories', 'Our scrapbook.'], ['Milestones', 'Our milestones.'], ['Profile', 'Hello, Pooja.']]) {
    await page.locator('.bottom-nav').getByRole('link', { name: label, exact: true }).click();
    await page.getByRole('heading', { name: title }).waitFor();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width, `${label} overflows: ${JSON.stringify(dimensions)}`);
    if (label === 'Home') await page.screenshot({ path: '.qa/home-mobile.png', fullPage: true });
  }
  await page.getByRole('button', { name: 'Leave preview' }).click();
  await page.getByRole('heading', { name: 'Back to us.' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Back to us.' }).waitFor();
  assert.deepEqual(issues, []);
  console.log('Browser checks passed: protected routes, preview, navigation, calendar, search, POV ownership, deletion confirmation, and 320px overflow.');
  await context.close();
} finally { await browser.close(); }
