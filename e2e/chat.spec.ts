import { test, expect } from '@playwright/test';

test.describe('QuantChat Real-time Messaging', () => {
  test('should send and receive messages in real-time', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Go to chat
    await page.goto('/chat');

    // Send a message
    await page.fill('textarea[placeholder="Type a message"]', 'Hello from load test!');
    await page.click('button:has-text("Send")');

    // Expect message to appear
    await expect(page.locator('text=Hello from load test!')).toBeVisible();

    // Test typing indicator
    await page.fill('textarea[placeholder="Type a message"]', 'typing...');
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
  });
});
