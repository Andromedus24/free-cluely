/**
 * Authentication E2E Tests
 * Tests user authentication flows
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Login/)

    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for invalid login data', async ({ page }) => {
    await page.goto('/login')

    // Try to submit with empty fields
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()

    // Try with invalid email
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Invalid email format')).toBeVisible()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login')

    // Fill in login form with valid data
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard/main')
  })

  test('should display registration form', async ({ page }) => {
    await page.goto('/register')

    // Check for registration form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Enter your full name"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should validate registration form', async ({ page }) => {
    await page.goto('/register')

    // Try to submit with empty fields
    await page.click('button[type="submit"]')

    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
    await expect(page.locator('text=Full name is required')).toBeVisible()

    // Try with weak password
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'weak')
    await page.fill('input[placeholder="Enter your full name"]', 'Test User')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
  })

  test('should show password reset form', async ({ page }) => {
    await page.goto('/reset-password')

    // Check for password reset form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('text=Send reset instructions')).toBeVisible()
  })

  test('should handle authentication state persistence', async ({ page }) => {
    // Mock successful login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    // Navigate away and back
    await page.goto('/')
    await page.goto('/dashboard/main')

    // Should still be authenticated
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should handle logout', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard/main')

    // Find and click logout button
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // Should redirect to login page
    await expect(page).toHaveURL('/login')
  })

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard/main')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should handle OAuth login options', async ({ page }) => {
    await page.goto('/login')

    // Check for OAuth buttons
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible()
  })

  test('should show loading states during authentication', async ({ page }) => {
    await page.goto('/login')

    // Fill form and submit
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')

    // Click submit and check for loading state
    await page.click('button[type="submit"]')
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto('/login')

    // Mock API error
    await page.route('**/auth/v1/token**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      })
    })

    // Try to login with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrong-password')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should validate email format on registration', async ({ page }) => {
    await page.goto('/register')

    // Try invalid email formats
    const invalidEmails = [
      'invalid-email',
      'invalid@email',
      '@invalid.com',
      'invalid@.com',
      'invalid@invalid.'
    ]

    for (const email of invalidEmails) {
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', 'ValidPass123!')
      await page.fill('input[placeholder="Enter your full name"]', 'Test User')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=Invalid email format')).toBeVisible()
    }
  })

  test('should require strong password on registration', async ({ page }) => {
    await page.goto('/register')

    const weakPasswords = [
      'password',
      '12345678',
      'password123',
      'PASSWORD',
      'Password',
      '12345678!'
    ]

    for (const password of weakPasswords) {
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', password)
      await page.fill('input[placeholder="Enter your full name"]', 'Test User')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=Password must contain uppercase, lowercase, and number')).toBeVisible()
    }
  })
})