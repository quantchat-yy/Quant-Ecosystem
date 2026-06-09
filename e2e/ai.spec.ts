import { test, expect } from '@playwright/test';

test.describe('QuantAI Multi-Model Chat', () => {
  test('should chat with AI and get streaming response', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    await page.goto('/ai');

    // Send message to AI
    await page.fill(
      'textarea[placeholder="Ask anything..."]',
      'Explain quantum computing in simple terms',
    );
    await page.click('button:has-text("Send")');

    // Expect streaming response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });

    // Test model switching
    await page.selectOption('select[name="model"]', 'claude-3-5-sonnet');
    await page.fill('textarea[placeholder="Ask anything..."]', 'What is the capital of France?');
    await page.click('button:has-text("Send")');

    await expect(page.locator('text=Paris')).toBeVisible();
  });
});
