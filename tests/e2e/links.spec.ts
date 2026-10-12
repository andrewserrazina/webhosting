import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

test('internal links and in-page anchors resolve', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'runs once on desktop');
  const status = new Map<string, number>();
  const problems: string[] = [];

  for (const route of ROUTES) {
    await page.goto(route);
    const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      if (/^(mailto:|tel:|https?:)/.test(href)) continue;
      const url = new URL(href, `http://local${route}`);
      const path = url.pathname;
      if (!status.has(path)) status.set(path, (await request.get(path, { maxRedirects: 0 })).status());
      if (status.get(path) !== 200) problems.push(`${route} -> ${href} (${status.get(path)})`);
      if (url.hash.length > 1) {
        const id = url.hash.slice(1);
        const html = path === route ? await page.content() : await (await request.get(path)).text();
        if (!html.includes(`id="${id}"`)) problems.push(`${route} -> missing anchor ${href}`);
      }
    }
  }
  expect(problems).toEqual([]);
  expect(status.size).toBeGreaterThan(8);
});

test('external portfolio links open safely in a new tab', async ({ page }) => {
  await page.goto('/work/dc-granite-and-marble');
  const links = page.locator('a[href^="https://dcgraniteandmarble.net"]');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
});
