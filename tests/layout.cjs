const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');

const root = resolve(__dirname, '..');
const pages = ['index', 'approach', 'ai-technologies', 'industries', 'about', 'contact', 'technology'];
const sizes = [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [820, 1180], [1024, 768], [1280, 800], [1440, 800], [1920, 1080]];
const screenshotDir = process.env.SCREENSHOT_DIR;
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      const selected = [320, 390, 820, 1440].includes(width) ? pages : ['index', 'approach'];
      for (const name of selected) {
        await page.goto(pathToFileURL(resolve(root, `${name}.html`)).href);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('h1').count(), 1, `${name}: one main heading`);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: page overflow at ${width}`);
        const overflow = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main a')].filter(el => {
          const box = el.getBoundingClientRect();
          return box.width && (box.left < -1 || box.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1);
        }).map(el => el.textContent.trim()));
        assert.deepEqual(overflow, [], `${name}: text overflow at ${width}`);

        if (name === 'index') {
          for (const selector of ['h1', '.hero-actions']) {
            const box = await page.locator(selector).boundingBox();
            assert(box && box.y >= 68 && box.y + box.height < height, `${selector}: outside first viewport at ${width}`);
          }
          const hero = await page.locator('.home-hero').boundingBox();
          const visual = await page.locator('.home-hero-media').boundingBox();
          if (width < 768) {
            const actions = await page.locator('.hero-actions').boundingBox();
            assert(visual.y >= actions.y + actions.height, 'Mobile visual never overlaps hero copy or actions');
            assert(visual.y < height - 30, `Hint of the illustration below the hero copy missing at ${width}`);
          } else {
            assert(hero.y + hero.height < height, `Next section missing at ${width}`);
          }
          assert(await page.locator('.hero-poster').evaluate(img => img.complete && img.naturalWidth > 0), 'Hero asset loaded');
          assert.match(await page.locator('.hero-actions .primary-link').getAttribute('href'), /^contact.html$/);
        }
        if (width === 390) {
          await page.locator('.mobile-menu summary').click();
          assert(await page.locator('.mobile-links').isVisible(), `${name}: menu opens`);
          await page.keyboard.press('Escape');
          assert(!(await page.locator('.mobile-links').isVisible()), `${name}: Escape closes menu`);
        }
        if (width === 1440) {
          const links = await page.locator('a[href], script[src], link[href]').evaluateAll(elements => elements.map(el => el.getAttribute('href') || el.getAttribute('src')));
          for (const link of links) {
            const url = new URL(link, page.url());
            if (url.protocol === 'file:') assert(fs.existsSync(fileURLToPath(url)), `${name}: missing local asset/link ${link}`);
          }
        }
        if (screenshotDir && [320, 390, 1440, 1920].includes(width)) {
          await page.screenshot({ path: resolve(screenshotDir, `${name}-${width}.png`) });
        }
      }
      console.log(`PASS ${width}x${height}: ${selected.length} pages`);
    }
    assert.deepEqual(errors, [], 'No JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
