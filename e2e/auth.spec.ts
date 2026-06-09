import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to register and login', async ({ page }) => {
    // Go to registration page
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Expect success redirect or message
    await expect(page).toHaveURL(/dashboard|login/);

    // Login test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard/);
  });

  test('should allow OAuth2 authorization', async ({ page }) => {
    await page.goto(
      '/oauth/authorize?client_id=test-client&redirect_uri=http://localhost:3000/callback&response_type=code',
    );

    // Should show consent screen
    await expect(page.locator('text=Authorize Application')).toBeVisible();

    // Click approve
    await page.click('button:has-text("Approve")');

    // Should redirect with code
    await expect(page).toHaveURL(/code=/);
  });
});
