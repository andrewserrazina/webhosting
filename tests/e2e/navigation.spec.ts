import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

test('skip link moves focus to main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard test runs on desktop');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('primary CTAs lead to the audit form and portfolio', async ({ page }) => {
  await page.goto('/');
  await page.locator('#main').getByRole('link', { name: 'Get a Free Website Audit' }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('button', { name: 'Request My Free Website Audit' })).toBeVisible();

  await page.goto('/');
  await page.locator('#main').getByRole('link', { name: 'Explore Our Work' }).first().click();
  await expect(page).toHaveURL(/\/work$/);
});

test('portfolio cards open each case study', async ({ page }) => {
  for (const name of ['D&C Granite & Marble', 'RealtorFinder', 'Apex Aviation']) {
    await page.goto('/work');
    await page.locator('#main').getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  }
});

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('main navigation reaches every section and marks the current page', async ({ page }) => {
    await page.goto('/');
    for (const [label, path] of [
      ['Services', '/services'],
      ['Work', '/work'],
      ['About', '/about'],
      ['Contact', '/contact'],
    ]) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('menu opens, navigates, and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-menu-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('navigation', { name: 'Mobile' });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await menu.getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/\/services$/);
  });

  test('no page scrolls horizontally', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, route).toBeLessThanOrEqual(0);
    }
  });
});
