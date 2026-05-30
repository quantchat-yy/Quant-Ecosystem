import { test, expect } from '@playwright/test';
import { TEST_AI_SESSIONS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAI - Ask Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'ai');
  });

  test('should load ask page with message input area', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/ask anything|type a message|ask a question/i),
    ).toBeVisible();
  });

  test('should show loading indicator after submitting a question', async ({ page }) => {
    const input = page.getByPlaceholder(/ask anything|type a message|ask a question/i);
    await input.fill(TEST_AI_SESSIONS.basic.messages[0].content);
    await page.getByRole('button', { name: /send/i }).click();

    await expect(
      page
        .locator('[data-testid="loading-indicator"], [aria-label="Loading"]')
        .or(page.getByText(/thinking|generating/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display response message after submission', async ({ page }) => {
    const input = page.getByPlaceholder(/ask anything|type a message|ask a question/i);
    await input.fill(TEST_AI_SESSIONS.basic.messages[0].content);
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.locator('[data-testid="ai-response"]').first()).toBeVisible({
      timeout: 30000,
    });
  });

  test('should update conversation history after multiple messages', async ({ page }) => {
    const input = page.getByPlaceholder(/ask anything|type a message|ask a question/i);
    await input.fill('What is 2 + 2?');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.locator('[data-testid="ai-response"]').first()).toBeVisible({
      timeout: 30000,
    });

    await input.fill('Now multiply that by 3');
    await page.getByRole('button', { name: /send/i }).click();

    const messages = page.locator(
      '[data-testid="chat-message"], [data-testid="ai-response"], [data-testid="user-message"]',
    );
    await expect(messages).toHaveCount(4, { timeout: 30000 });
  });
});
