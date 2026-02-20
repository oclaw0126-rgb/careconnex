/**
 * E2E Test Suite for CareConnex
 * Run with: npx playwright test e2e/critical-flows.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Critical User Flows', () => {
  
  test('Landing page - zip code validation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Test 1: Zip input should only accept numbers
    const zipInput = page.locator('input[placeholder*="Zip"], input[type="text"]').first();
    await zipInput.fill('abc123');
    await expect(zipInput).toHaveValue('123'); // Should strip letters
    
    // Test 2: Button disabled with < 5 digits
    const findButton = page.locator('button:has-text("Find Caregivers")');
    await expect(findButton).toBeDisabled();
    
    // Test 3: Button enabled with 5 digits
    await zipInput.fill('94102');
    await expect(findButton).toBeEnabled();
    
    // Test 4: Click navigates to signup
    await findButton.click();
    await expect(page).toHaveURL(/.*signup|.*client/);
  });

  test('Client booking flow - natural language search', async ({ page }) => {
    // Navigate to client dashboard (may need auth setup)
    await page.goto(`${BASE_URL}/client-dashboard`);
    
    // Find AI search input
    const searchInput = page.locator('input[placeholder*="describe"], textarea').first();
    await searchInput.fill('My mother has dementia and needs 4 hours of care tomorrow');
    
    // Submit search
    const searchButton = page.locator('button:has-text("Search"), button:has-text("Find")').first();
    await searchButton.click();
    
    // Verify matches appear
    await expect(page.locator('text=Match Score').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=% match').first()).toBeVisible();
    
    // Select first caregiver
    const selectButton = page.locator('button:has-text("Select")').first();
    await selectButton.click();
    
    // Verify booking summary
    await expect(page.locator('text=Booking Summary')).toBeVisible();
    await expect(page.locator('text=Confirm')).toBeVisible();
  });

  test('Caregiver onboarding flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/become-caregiver`);
    
    // Fill application
    await page.locator('input[name="name"]').fill('Test Caregiver');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="phone"]').fill('4155550123');
    await page.locator('select[name="experience"]').selectOption('3-5');
    
    // Submit
    await page.locator('button:has-text("Submit")').click();
    
    // Verify verification screen
    await expect(page.locator('text=Verifying')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Background Check')).toBeVisible();
  });

  test('Visit tracking - real-time updates', async ({ page }) => {
    // Requires existing booking
    await page.goto(`${BASE_URL}/visits`);
    
    // Verify visit card visible
    await expect(page.locator('text=Today').or(page.locator('text=Visit'))).toBeVisible();
    
    // Verify action buttons
    await expect(page.locator('button:has-text("Call")').or(page.locator('text=Call Caregiver'))).toBeVisible();
    await expect(page.locator('button:has-text("Message")').or(page.locator('text=Send Message'))).toBeVisible();
  });

});
