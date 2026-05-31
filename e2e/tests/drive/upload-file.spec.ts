import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantDrive - File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'drive');
  });

  test('should display file list on load', async ({ page }) => {
    await expect(
      page
        .getByRole('main')
        .or(
          page
            .locator('[data-testid="file-list"]')
            .or(page.getByText(/my files|drive|storage/i).first()),
        ),
    ).toBeVisible();
  });

  test('should have an upload button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /upload/i })).toBeVisible();
  });

  test('should upload a file via file input', async ({ page }) => {
    // Look for the file input (may be hidden behind an upload button)
    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test file content for E2E testing.'),
      });
      // After upload, file should appear in the list
      await expect(page.getByText('test-document.txt')).toBeVisible({ timeout: 15000 });
    } else {
      // If no file input visible, click upload button first
      await page.getByRole('button', { name: /upload/i }).click();
      const input = page.locator('input[type="file"]');
      await input.setInputFiles({
        name: 'test-document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test file content for E2E testing.'),
      });
      await expect(page.getByText('test-document.txt')).toBeVisible({ timeout: 15000 });
    }
  });
});
