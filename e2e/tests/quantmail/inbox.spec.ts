import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantMail - Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'mail');
  });

  test('should load inbox page with email list', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /inbox/i }).or(page.getByText(/inbox/i).first()),
    ).toBeVisible();
    const emailList = page
      .locator('[data-testid="email-list"], [role="list"], table tbody')
      .first();
    await expect(emailList).toBeVisible();
  });

  test('should display emails with sender and subject', async ({ page }) => {
    const firstEmail = page
      .locator('[data-testid="email-item"], [data-testid="email-row"], li, tbody tr')
      .first();
    await expect(firstEmail).toBeVisible();
    // Emails should contain visible text for sender and subject
    await expect(firstEmail.locator('text=/\\S+/')).toBeVisible();
  });

  test('should open email detail when clicking an email', async ({ page }) => {
    const firstEmail = page
      .locator('[data-testid="email-item"], [data-testid="email-row"], li, tbody tr')
      .first();
    await firstEmail.click();

    await expect(
      page
        .locator('[data-testid="email-detail"], [data-testid="email-preview"]')
        .or(page.getByText(/from:|reply|forward/i).first()),
    ).toBeVisible();
  });

  test('should show unread count indicator', async ({ page }) => {
    const unreadBadge = page
      .locator('[data-testid="unread-count"], [aria-label*="unread"]')
      .or(page.locator('.badge, .unread-count').first());
    await expect(unreadBadge).toBeVisible();
  });
});
