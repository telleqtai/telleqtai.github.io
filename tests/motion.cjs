const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const url = pathToFileURL(resolve(__dirname, '../index.html')).href;
const pause = page => page.waitForTimeout(1600);
const transform = (page, selector) => page.locator(selector).evaluate(el => getComputedStyle(el).transform);
const flowPixels = page => page.locator('.hero-flow-canvas').evaluate(canvas => {
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 2166136261, painted = 0;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i]) painted++;
    if (i % 64 === 3) hash = Math.imul(hash ^ pixels[i], 16777619);
  }
  return { hash, painted };
});

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    assert.equal(await page.locator('.signal-canvas').count(), 0, 'Old packet animation removed');
    assert.equal(await page.locator('.hero-flow-canvas').count(), 1, 'Ambient data-flow canvas exists');
    assert(await page.evaluate(() => Boolean(window.gsap)), 'Local GSAP runtime loads');
    assert(await page.locator('.hero-poster').evaluate(img => img.complete && img.naturalWidth > 0 && img.currentSrc.startsWith('file:')), 'Local hero image loads');
    await page.waitForSelector('.hero-flow-scene.is-ready');
    await page.waitForTimeout(5600);
    assert.match(await page.locator('.hero-poster').getAttribute('src'), /hero-ai-installation/, 'Approved installation keyframe is the static fallback');
    assert.equal(await page.locator('.hero-legacy-base').count(), 1, 'Existing systems have an independent static layer');
    assert.equal(await page.locator('.hero-ai-module').count(), 1, 'AI module is independently animated');
    assert.equal(await page.locator('.hero-install-hand').count(), 1, 'Hand is independently animated');
    const initialFlow = await flowPixels(page);
    assert(initialFlow.painted > 100, 'Flow is visibly drawn');
    await page.waitForTimeout(700);
    assert.notEqual((await flowPixels(page)).hash, initialFlow.hash, 'Flow moves without pointer or scroll input');
    const pauseButton = page.getByRole('button', { name: 'Pause animation', exact: true });
    await pauseButton.click();
    const pausedFlow = await flowPixels(page);
    await page.waitForTimeout(700);
    assert.deepEqual(await flowPixels(page), pausedFlow, 'Pause control freezes flow');
    await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
    const before = await transform(page, '.home-hero-media');
    await page.mouse.move(1200, 360);
    await pause(page);
    assert.notEqual(await transform(page, '.home-hero-media'), before, 'Fine pointer creates restrained depth');
    await page.locator('.delivery-section').scrollIntoViewIfNeeded();
    await pause(page);
    const offscreenFlow = await flowPixels(page);
    await page.waitForTimeout(700);
    assert.deepEqual(await flowPixels(page), offscreenFlow, 'Offscreen flow stops drawing');
    for (const item of await page.locator('.delivery-steps li').all()) {
      assert.equal(await item.evaluate(el => getComputedStyle(el).opacity), '1', 'Revealed content fully readable');
    }
    assert.equal(await page.evaluate(() => gsap.globalTimeline.getChildren(true, true, false).filter(tween => tween.isActive()).length), 0, 'Animations settle when hero is offscreen');
    await page.mouse.wheel(0, 250);
    await pause(page);
    const scrollPosition = await page.evaluate(() => scrollY);
    await page.setViewportSize({ width: 1000, height: 900 });
    await pause(page);
    assert(Math.abs(await page.evaluate(() => scrollY) - scrollPosition) < 160, 'Crossing desktop breakpoint preserves reading position through normal reflow');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.delivery-steps li').first().evaluate(el => getComputedStyle(el).opacity), '1', 'Completed reveals do not replay on resize');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await pause(page);
    assert.equal(await transform(page, '.home-hero-media'), 'none', 'Reduced motion clears transforms');
    assert.equal(await page.evaluate(() => gsap.globalTimeline.getChildren(true, true, false).filter(tween => tween.isActive()).length), 0, 'Reduced motion cleans up animations');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto', 'Live reduced motion disables smooth scrolling');
    assert(!(await page.locator('.hero-flow-canvas').isVisible()), 'Reduced motion uses the static image');
    assert(!(await page.locator('.hero-motion-toggle').isVisible()), 'Unnecessary pause control hidden for reduced motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await pause(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await pause(page);
    const resumed = await transform(page, '.home-hero-media');
    await page.mouse.move(300, 300);
    await pause(page);
    assert.notEqual(await transform(page, '.home-hero-media'), resumed, 'Motion can be re-enabled');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobile.goto(url);
    await mobile.waitForSelector('.hero-flow-scene.is-ready');
    await mobile.waitForTimeout(5600);
    const mobileFlow = await flowPixels(mobile);
    assert(mobileFlow.painted > 100, 'Mobile flow is nonblank');
    await mobile.waitForTimeout(700);
    assert.notEqual((await flowPixels(mobile)).hash, mobileFlow.hash, 'Mobile flow moves without interaction');
    const still = await transform(mobile, '.home-hero-media');
    await mobile.mouse.move(350, 300);
    await pause(mobile);
    assert.equal(await transform(mobile, '.home-hero-media'), still, 'No pointer animation on touch devices');

    const fallback = await browser.newPage({ reducedMotion: 'reduce' });
    await fallback.route('**/vendor/gsap/**', route => route.abort());
    await fallback.goto(url);
    assert(await fallback.evaluate(() => !window.gsap), 'Runtime failure simulated');
    assert.equal(await fallback.locator('h1').evaluate(el => getComputedStyle(el).opacity), '1', 'Copy visible without GSAP');
    assert.equal(await transform(fallback, '.home-hero-media'), 'none', 'Static image when runtime unavailable');
    await fallback.setViewportSize({ width: 390, height: 844 });
    await fallback.locator('.mobile-menu summary').click();
    assert(await fallback.locator('.mobile-links').isVisible(), 'Navigation independent of animation runtime');
    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(url);
    assert(await noJS.locator('.hero-actions .primary-link').isVisible(), 'CTA available without JavaScript');
    assert.equal(await noJS.locator('h1').evaluate(el => getComputedStyle(el).opacity), '1', 'Heading visible without JavaScript');
    assert.deepEqual(errors, [], 'No JavaScript errors');
    console.log('PASS: local assets, pointer depth, touch fallback, reveal readability, reduced-motion cleanup and missing-runtime fallback');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
