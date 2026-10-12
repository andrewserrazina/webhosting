import { expect, test, type Page } from '@playwright/test';

const SUBMIT = 'Request My Free Website Audit';

async function fillValid(page: Page) {
  await page.locator('#cf-name').fill('Jordan Rivera');
  await page.getByLabel('Email').fill('jordan@example.com');
  await page.getByLabel('Business name').fill('Rivera Roofing');
  await page.getByLabel('Existing website (optional)').fill('riveraroofing.com');
  await page.getByLabel('Service needed').selectOption('website-audit');
  await page
    .getByLabel('Brief project description')
    .fill('Our website is dated and hard to use on phones. Please review it.');
  await page.getByRole('checkbox').check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/contact');
});

test('shows inline errors and focuses the first invalid field on empty submit', async ({ page }) => {
  await page.getByRole('button', { name: SUBMIT }).click();
  await expect(page.locator('#cf-name')).toBeFocused();
  await expect(page.locator('#cf-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#cf-name-error')).toHaveText('Please enter your name.');
  await expect(page.locator('#cf-email-error')).toBeVisible();
  await expect(page.locator('#cf-consent-error')).toBeVisible();
});

test('validates email and website format as the visitor types', async ({ page }) => {
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Email').blur();
  await expect(page.locator('#cf-email-error')).toContainText('valid email');
  await page.getByLabel('Email').fill('ok@example.com');
  await expect(page.locator('#cf-email-error')).toBeHidden();

  await page.getByLabel('Existing website (optional)').fill('not a url');
  await page.getByLabel('Existing website (optional)').blur();
  await expect(page.locator('#cf-website-error')).toContainText('valid website');
});

test('preselects the service from the query string', async ({ page }) => {
  await page.goto('/contact?service=website-care');
  await expect(page.getByLabel('Service needed')).toHaveValue('website-care');
});

test('shows the success state after a successful submission', async ({ page }) => {
  let payload: Record<string, unknown> = {};
  await page.route('**/api/contact', async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'ok', referenceId: 'ref-123' }),
    });
  });
  await fillValid(page);
  await page.getByRole('button', { name: SUBMIT }).click();
  const success = page.locator('[data-form-success]');
  await expect(success).toBeVisible();
  await expect(success).toBeFocused();
  await expect(success).toContainText('jordan@example.com');
  await expect(success).toContainText('ref-123');
  await expect(page.locator('[data-contact-form]')).toBeHidden();
  expect(payload.email).toBe('jordan@example.com');
  expect(payload.consent).toBe(true);
  expect(payload.nl_started_at).toBeTruthy();
});

test('shows a clear error, keeps the input, and allows retry when delivery fails', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/contact', async (route) => {
    calls += 1;
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        code: 'delivery_failed',
        message: 'Something went wrong sending your request.',
      }),
    });
  });
  await fillValid(page);
  await page.getByRole('button', { name: SUBMIT }).click();
  const alert = page.locator('[data-form-error]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('not sent');
  await expect(alert).toContainText('Something went wrong sending your request.');
  await expect(page.locator('#cf-name')).toHaveValue('Jordan Rivera');
  await expect(page.getByRole('button', { name: SUBMIT })).toBeEnabled();
  await page.getByRole('button', { name: SUBMIT }).click();
  await expect.poll(() => calls).toBe(2);
});

test('shows server-side field errors returned by the API', async ({ page }) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        code: 'validation_failed',
        message: 'Please correct the highlighted fields and try again.',
        errors: { email: 'Please enter a valid email address, like you@company.com.' },
      }),
    }),
  );
  await fillValid(page);
  await page.getByRole('button', { name: SUBMIT }).click();
  await expect(page.locator('#cf-email-error')).toContainText('valid email');
});

test('handles network failure without losing the submission', async ({ page }) => {
  await page.route('**/api/contact', (route) => route.abort('failed'));
  await fillValid(page);
  await page.getByRole('button', { name: SUBMIT }).click();
  await expect(page.locator('[data-form-error]')).toContainText('couldn’t reach our server');
  await expect(page.getByLabel('Email')).toHaveValue('jordan@example.com');
});

test('live endpoint without email credentials reports that nothing was sent', async ({ page }) => {
  // Hits the real Pages Function (no mock). Wait past the minimum fill time first.
  await fillValid(page);
  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: SUBMIT }).click();
  const alert = page.locator('[data-form-error]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('not delivered');
  await expect(page.locator('[data-form-success]')).toBeHidden();
});
