const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');

const url = pathToFileURL(resolve(__dirname, '../index.html')).href;
const screenshotDir = process.env.SCREENSHOT_DIR;
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const requests = [];
    const errors = [];
    page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const section = page.locator('.trust-strip + .overview-section');
    assert.equal(await section.count(), 1, 'The overview film appears immediately after the client logos');
    const player = section.locator('video');
    const play = section.getByRole('link', { name: /play.*video/i });
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const poster = document.querySelector('.overview-poster');
      return poster?.complete && poster.naturalWidth > 0;
    });
    await page.waitForTimeout(300);
    assert.equal(requests.length, 0, 'Scrolling to the poster must not download the video');
    assert(await player.evaluate(video => video.paused && !video.autoplay), 'No automatic playback or sound');

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await section.scrollIntoViewIfNeeded();
      const frame = await section.locator('.overview-player').boundingBox();
      const playIcon = await section.locator('.overview-play-icon').boundingBox();
      assert(frame.x >= 0 && frame.x + frame.width <= width, `Player fits at ${width}px`);
      assert(Math.abs(frame.width / frame.height - 16 / 9) < .02, `Video retains its full frame at ${width}px`);
      assert(Math.abs(playIcon.x + playIcon.width / 2 - frame.x - frame.width / 2) < 1, `Play is horizontally centered at ${width}px`);
      assert(Math.abs(playIcon.y + playIcon.height / 2 - frame.y - frame.height / 2) < 1, `Play is vertically centered at ${width}px`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
      if (screenshotDir) await section.screenshot({ path: resolve(screenshotDir, `overview-${width}.png`) });
    }

    await play.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.overview-player video')?.currentTime > .2);
    assert(requests.length > 0, 'Playback loads the local MP4 on demand');
    assert(await player.evaluate(video => video.controls && video.playsInline && !video.muted), 'Native controls, inline playback and sound are available');
    assert(await player.evaluate(video => document.activeElement === video), 'Keyboard focus moves from the cover to the player');
    assert(!(await play.isVisible()), 'The cover does not obstruct playback');
    assert(await player.evaluate(video => video.videoWidth === 1920 && video.videoHeight === 1080), 'The original HD video decodes');
    assert(await player.evaluate(video => getComputedStyle(video).objectFit === 'contain'), 'The video and baked-in subtitles are not cropped');
    assert.equal(await player.evaluate(video => getComputedStyle(video).filter), 'none', 'Poster dimming does not affect video playback');
    await player.evaluate(video => { video.pause(); video.currentTime = 45; });
    await page.waitForFunction(() => {
      const video = document.querySelector('.overview-player video');
      return !video.seeking && video.currentTime >= 45 && video.readyState >= 2;
    });
    if (screenshotDir) await section.screenshot({ path: resolve(screenshotDir, 'overview-playing.png') });
    console.log('PASS: placement, deferred media, keyboard playback, original HD frame, seeking, responsive poster');

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await phone.goto(url);
    await phone.locator('.overview-play').tap();
    await phone.waitForFunction(() => document.querySelector('.overview-player video')?.currentTime > .2);
    await phone.locator('video').evaluate(video => video.pause());
    assert(await phone.locator('video').isVisible(), 'Video plays inline after a touch');
    const phoneFrame = await phone.locator('video').boundingBox();
    assert(phoneFrame.x >= 0 && phoneFrame.x + phoneFrame.width <= 390, 'Active mobile video fits the page');
    console.log('PASS: mobile touch playback');

    const broken = await browser.newPage({ reducedMotion: 'reduce' });
    await broken.route('**/*.mp4', route => route.abort());
    await broken.goto(url);
    await broken.locator('.overview-play').click();
    await broken.locator('.overview-status').waitFor({ state: 'visible' });
    assert(await broken.locator('.overview-play').isVisible(), 'A media error restores the cover so playback can be retried');
    assert(await broken.locator('.overview-status a').isVisible(), 'A media error offers a direct video link');
    await broken.unroute('**/*.mp4');
    await broken.locator('.overview-play').click();
    await broken.waitForFunction(() => document.querySelector('.overview-player video')?.currentTime > .2);
    assert(!(await broken.locator('.overview-status').isVisible()), 'A successful retry clears the error');
    await broken.locator('video').evaluate(video => video.pause());
    console.log('PASS: media-error recovery and retry');

    const noScript = await browser.newPage({ javaScriptEnabled: false });
    await noScript.goto(url);
    const fallback = noScript.locator('.overview-play');
    assert(await fallback.isVisible(), 'Without JavaScript the film remains accessible');
    assert(fs.existsSync(fileURLToPath(new URL(await fallback.getAttribute('href'), url))), 'The no-JavaScript link resolves to the local video');
    assert.deepEqual(errors, [], 'No JavaScript errors');
    console.log('PASS: no-JavaScript fallback');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
