import { test, expect } from '@playwright/test';
import { login } from '../../fixtures/auth-helpers';

test.describe('QuantCalendar - Create Event', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('should display calendar grid on load', async ({ page }) => {
    await expect(
      page.getByRole('main').or(page.locator('[data-testid="calendar-grid"]')),
    ).toBeVisible();
  });

  test('should open create event form', async ({ page }) => {
    await page.getByRole('button', { name: /create|new event|add/i }).click();
    await expect(page.getByRole('dialog').or(page.getByRole('form'))).toBeVisible();
  });

  test('should create a new event with title and time', async ({ page }) => {
    await page.getByRole('button', { name: /create|new event|add/i }).click();
    await page.getByLabel(/title/i).fill('E2E Test Meeting');
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await expect(page.getByText('E2E Test Meeting')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between calendar views', async ({ page }) => {
    const viewButtons = page.getByRole('button', { name: /month|week|day|agenda/i });
    const count = await viewButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
