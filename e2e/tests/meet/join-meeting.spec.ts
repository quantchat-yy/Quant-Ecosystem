import { test, expect } from '@playwright/test';
import { login } from '../../fixtures/auth-helpers';

test.describe('QuantMeet - Join Meeting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await page.goto('/meet');
    await page.waitForLoadState('networkidle');
  });

  test('should display meeting landing page', async ({ page }) => {
    await expect(
      page
        .getByRole('heading', { name: /meet|meeting|conference/i })
        .or(page.getByText(/start|join|new meeting/i).first()),
    ).toBeVisible();
  });

  test('should create a new meeting room', async ({ page }) => {
    await page.getByRole('button', { name: /new meeting|start|create/i }).click();
    // Should navigate to meeting room or show pre-join lobby
    await expect(
      page
        .getByRole('button', { name: /join|enter/i })
        .or(page.locator('[data-testid="control-bar"]').or(page.getByRole('toolbar'))),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show meeting controls in the meeting room', async ({ page }) => {
    await page.getByRole('button', { name: /new meeting|start|create/i }).click();
    // Look for control bar with expected buttons
    const toolbar = page
      .getByRole('toolbar', { name: /meeting controls/i })
      .or(page.locator('[data-testid="control-bar"]'));
    await expect(toolbar.or(page.getByRole('button', { name: /mic|mute/i }))).toBeVisible({
      timeout: 10000,
    });
  });
});
