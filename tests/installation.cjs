const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const url = pathToFileURL(resolve(__dirname, '../index.html')).href;
const state = page => page.evaluate(() => {
  const style = selector => {
    const element = document.querySelector(selector);
    const css = getComputedStyle(element);
    return { transform: css.transform, opacity: css.opacity };
  };
  return { hand: style('.hero-install-hand'), ai: style('.hero-ai-module'), legacy: style('.hero-legacy-base') };
});

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url);
    assert.equal(await page.locator('.hero-install-hand').count(), 1, 'Installation needs a movable hand over static systems');
    await page.waitForSelector('.hero-flow-scene.is-ready');
    const start = await state(page);
    await page.waitForTimeout(450);
    const moving = await state(page);
    assert.notEqual(start.hand.transform, moving.hand.transform, 'Hand lowers into place');
    assert.notEqual(start.ai.transform, moving.ai.transform, 'AI moves with the hand');
    assert.deepEqual(start.legacy, moving.legacy, 'Legacy systems remain intact and stationary');
    await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
    const paused = await state(page);
    await page.waitForTimeout(650);
    assert.deepEqual(await state(page), paused, 'Manual pause freezes installation as well as pulses');
    await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
    await page.waitForTimeout(6200);
    assert.equal((await state(page)).hand.opacity, '0', 'Hand leaves after installation');
    assert(Number((await state(page)).ai.opacity) > .9, 'Installed AI remains illuminated');
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(400);
    assert.equal((await state(page)).hand.opacity, '0', 'Resize does not replay installation');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.hero-poster').evaluate(el => getComputedStyle(el).opacity), '1', 'Reduced motion restores approved poster');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(400);
    assert.equal((await state(page)).hand.opacity, '0', 'Changing motion preference does not replay installation');

    const broken = await browser.newPage();
    await broken.route('**/img/hero-install-hand*.webp', route => route.abort());
    await broken.goto(url);
    await broken.waitForTimeout(600);
    assert.equal(await broken.locator('.hero-poster').evaluate(el => getComputedStyle(el).opacity), '1', 'A failed layer keeps the complete poster');
    assert(!(await broken.locator('.hero-motion-toggle').isVisible()), 'No nonfunctional control after a failed layer');

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await phone.goto(url);
    await phone.waitForSelector('.hero-flow-scene.is-ready');
    await phone.evaluate(() => document.fonts.ready);
    await phone.getByRole('button', { name: 'Pause animation', exact: true }).click();
    const control = phone.locator('.hero-motion-toggle');
    const normalControl = await control.screenshot();
    await control.evaluate(el => { el.style.zIndex = '100'; });
    assert((await control.screenshot()).equals(normalControl), 'Pause button is already painted above artwork, not merely present in DOM');

    const landscape = await browser.newPage({ viewport: { width: 568, height: 320 }, isMobile: true, hasTouch: true });
    await landscape.goto(url);
    await landscape.waitForSelector('.hero-flow-scene.is-ready');
    const unseen = await state(landscape);
    await landscape.waitForTimeout(600);
    assert.deepEqual(await state(landscape), unseen, 'Installation waits when the artwork is below the viewport');
    await landscape.locator('.home-hero-media').scrollIntoViewIfNeeded();
    await landscape.waitForTimeout(700);
    assert.notEqual((await state(landscape)).hand.transform, unseen.hand.transform, 'Installation starts when the artwork enters view');
    console.log('PASS: installation, unchanged legacy, pause, hand departure, no replay, failed-layer fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
