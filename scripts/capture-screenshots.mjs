// Captures authentic screenshots of Northline Digital portfolio projects.
// Usage: npm run screenshots
// Output: src/assets/work/<slug>-{desktop,desktop-long,mobile}.png
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../src/assets/work/', import.meta.url));

const projects = [
  { slug: 'dc-granite-and-marble', url: 'https://dcgraniteandmarble.net/' },
  { slug: 'realtorfinder', url: 'https://www.realtorfinder.net/' },
  { slug: 'apex-aviation', url: 'https://apexaviationtx.com/home' },
];

const executablePath = process.env.CHROMIUM_PATH || undefined;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath });

async function shoot(project, { name, viewport, isMobile = false, fullHeight }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile,
    hasTouch: isMobile,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(project.url, { waitUntil: 'networkidle', timeout: 60_000 });
  // Trigger lazy content / reveal-on-scroll, then return to top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);
  const path = `${outDir}${project.slug}-${name}.png`;
  await page.screenshot({
    path,
    clip: fullHeight ? { x: 0, y: 0, width: viewport.width, height: fullHeight } : undefined,
    fullPage: Boolean(fullHeight),
  });
  console.log('saved', path);
  await context.close();
}

// Removes cookie banners, modal dialogs and exit-intent popups so the capture
// shows the site itself. Does not alter any page content beyond overlays.
async function dismissOverlays(page) {
  await page.mouse.move(page.viewportSize().width - 5, page.viewportSize().height - 5);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      const text = (el.textContent || '').toLowerCase();
      const isDialog =
        el.matches('[role="dialog"], [aria-modal="true"], dialog') || /modal|popup|overlay/i.test(el.className);
      const isCookie = text.includes('cookie');
      const coversViewport = r.width * r.height > vw * vh * 0.5;
      if (isDialog || isCookie || coversViewport) el.remove();
    }
    // Collapse navigation dropdown menus that can render open in full-page captures.
    for (const el of document.querySelectorAll('.dropdown-menu, .sub-menu, .submenu, nav li > ul')) {
      if (getComputedStyle(el).position === 'absolute') el.style.display = 'none';
    }
    for (const el of document.querySelectorAll('.grecaptcha-badge')) {
      el.remove();
    }
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open', 'no-scroll');
  });
  await page.waitForTimeout(400);
}

for (const project of projects) {
  await shoot(project, { name: 'desktop', viewport: { width: 1440, height: 900 } });
  await shoot(project, { name: 'desktop-long', viewport: { width: 1440, height: 900 }, fullHeight: 2700 });
  await shoot(project, { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true });
}

await browser.close();
