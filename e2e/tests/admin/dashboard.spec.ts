import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    const admin = TEST_USERS.admin;
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard**');
    await page.goto('/admin');
  });

  test('should load admin dashboard page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard|admin/i })).toBeVisible();
  });

  test('should display app status cards with indicators', async ({ page }) => {
    const statusSection = page.locator('[data-testid="app-status"], [role="region"]').first();
    await expect(statusSection).toBeVisible();
    await expect(page.getByText(/online|running|healthy/i).first()).toBeVisible();
  });

  test('should show navigation sidebar with links', async ({ page }) => {
    const sidebar = page.locator('nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /services/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('should display overview stats section', async ({ page }) => {
    await expect(page.getByText(/users|total users/i).first()).toBeVisible();
    await expect(page.getByText(/services|active services/i).first()).toBeVisible();
  });

  test('should navigate to different sections via sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /users/i }).click();
    await expect(page).toHaveURL(/.*users.*/);
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });
});
