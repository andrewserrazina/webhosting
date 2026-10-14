import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTES } from './routes';

test.describe('core pages', () => {
  for (const route of ROUTES) {
    test(`${route} renders with SEO metadata`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      const response = await page.goto(route);
      expect(response?.status()).toBe(200);

      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('footer')).toBeVisible();

      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThanOrEqual(75);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThan(50);
      expect(description?.length ?? 0).toBeLessThanOrEqual(170);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical?.endsWith(route)).toBe(true);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        /\/og\/valebrook-studio\.png$/,
      );

      expect(await page.locator('img:not([alt])').count()).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test('page titles and descriptions are unique', async ({ page }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const route of ROUTES) {
      await page.goto(route);
      titles.add(await page.title());
      descriptions.add((await page.locator('meta[name="description"]').getAttribute('content')) ?? '');
    }
    expect(titles.size).toBe(ROUTES.length);
    expect(descriptions.size).toBe(ROUTES.length);
  });

  test('unknown routes return the 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('wrong turn');
  });

  test('robots.txt and sitemap are served', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap-0.xml');
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    for (const route of ROUTES) expect(xml).toContain(route === '/' ? '/</loc>' : `${route}</loc>`);
    expect(xml).not.toContain('thank-you');
  });

  test('homepage has accurate structured data', async ({ page }) => {
    await page.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)['@type']);
    expect(types).toContain('Organization');
    expect(blocks.join()).not.toMatch(/address|aggregateRating|review/i);
  });
});

test.describe('accessibility (axe)', () => {
  for (const route of [...ROUTES, '/contact/thank-you']) {
    test(`${route} has no detectable WCAG A/AA violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(summary).toEqual([]);
    });
  }
});
