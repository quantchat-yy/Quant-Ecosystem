import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Admin Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    const admin = TEST_USERS.admin;
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard**');
    await page.goto('/admin/users');
  });

  test('should load user list table with rows', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
    const table = page.locator('table, [data-testid="user-table"]').first();
    await expect(table).toBeVisible();
    const rows = page.locator('tbody tr, [data-testid="user-row"]');
    await expect(rows.first()).toBeVisible();
  });

  test('should filter users by search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search|filter/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('admin');
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test('should filter users by role dropdown', async ({ page }) => {
    const roleFilter = page
      .getByRole('combobox', { name: /role/i })
      .or(page.locator('[data-testid="role-filter"]'));
    await expect(roleFilter).toBeVisible();
    await roleFilter.click();
    await page.getByRole('option', { name: /admin/i }).click();
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test('should view user details by clicking a row', async ({ page }) => {
    const firstRow = page.locator('tbody tr, [data-testid="user-row"]').first();
    await firstRow.click();
    await expect(page.getByText(/user details|profile|email/i).first()).toBeVisible();
  });
});
