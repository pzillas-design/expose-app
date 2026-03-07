import { expect, test } from '@playwright/test';

test('public home page renders primary CTA', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: /projekt starten/i })
  ).toBeVisible();
});

test('contact page exposes support email and mail action', async ({ page }) => {
  await page.goto('/contact');

  await expect(
    page.getByRole('link', { name: 'hello@expose.ae' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello@expose.ae' })).toHaveAttribute(
    'href',
    'mailto:hello@expose.ae'
  );
  await expect(
    page.getByRole('button', { name: /nachricht senden|send a message/i })
  ).toBeVisible();
});

test('public pages expose guest navigation links in the menu', async ({ page }) => {
  await page.goto('/about');

  await page.getByRole('button', { name: /menü öffnen|open menu/i }).click();

  await expect(page.getByRole('button', { name: /about/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /kontakt|contact/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /anmelden|sign in/i })).toBeVisible();
});

test('contact page menu omits the current contact entry', async ({ page }) => {
  await page.goto('/contact');

  await page.getByRole('button', { name: /menü öffnen|open menu/i }).click();

  await expect(page.getByRole('button', { name: /about/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /anmelden|sign in/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /kontakt|contact/i })).toHaveCount(0);
});

test('guest menu sign in entry opens the auth modal', async ({ page }) => {
  await page.goto('/contact');

  await page.getByRole('button', { name: /menü öffnen|open menu/i }).click();
  await page.getByRole('button', { name: /anmelden|sign in/i }).click();

  await expect(page.getByRole('button', { name: 'Google Login' })).toBeVisible();
  await expect(page.getByPlaceholder(/email/i)).toBeVisible();
});

test('legacy project routes redirect to the public home page', async ({ page }) => {
  await page.goto('/projects/legacy-slug');

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('button', { name: /projekt starten/i })
  ).toBeVisible();
});
