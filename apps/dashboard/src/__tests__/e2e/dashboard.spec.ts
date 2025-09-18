/**
 * Dashboard E2E Tests
 * Tests main dashboard functionality and navigation
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token')
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        full_name: 'Test User'
      }))
    })
  })

  test('should load dashboard main page', async ({ page }) => {
    await page.goto('/dashboard/main')
    await expect(page).toHaveTitle(/Dashboard/)

    // Check for main dashboard elements
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('[data-testid="navigation-sidebar"]')).toBeVisible()
  })

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for navigation items
    const navItems = [
      'Dashboard',
      'Knowledge',
      '3D Modeling',
      'Messaging',
      'Voice Assistant',
      'Productivity',
      'Settings'
    ]

    for (const item of navItems) {
      await expect(page.locator(`nav >> text=${item}`)).toBeVisible()
    }
  })

  test('should navigate between sections', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Test navigation to different sections
    await page.click('nav >> text=Knowledge')
    await expect(page).toHaveURL('/knowledge')

    await page.click('nav >> text=3D Modeling')
    await expect(page).toHaveURL('/3d-modeling')

    await page.click('nav >> text=Messaging')
    await expect(page).toHaveURL('/messaging')

    await page.click('nav >> text=Dashboard')
    await expect(page).toHaveURL('/dashboard/main')
  })

  test('should display user information', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for user avatar and name
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('should show dashboard statistics', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for statistics cards
    await expect(page.locator('[data-testid="stats-card"]')).toBeVisible()
    await expect(page.locator('text=Knowledge Items')).toBeVisible()
    await expect(page.locator('text=3D Scenes')).toBeVisible()
    await expect(page.locator('text=Messages')).toBeVisible()
    await expect(page.locator('text=Productivity Score')).toBeVisible()
  })

  test('should handle responsive design', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('[data-testid="navigation-sidebar"]')).toBeVisible()

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
  })

  test('should display recent activities', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for recent activities section
    await expect(page.locator('[data-testid="recent-activities"]')).toBeVisible()
    await expect(page.locator('text=Recent Activities')).toBeVisible()
  })

  test('should show loading states', async ({ page }) => {
    // Mock slow loading
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 2000)
    })

    await page.goto('/dashboard/main')

    // Check for loading skeletons
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible()
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/dashboard/main')

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Failed to load dashboard data')).toBeVisible()
  })

  test('should allow user to search', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for search input
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'test search')
    await page.press('[data-testid="search-input"]', 'Enter')

    // Should show search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })

  test('should display notifications', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for notification bell
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible()

    // Click to show notifications
    await page.click('[data-testid="notification-bell"]')
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible()
  })

  test('should show theme toggle', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for theme toggle
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible()

    // Test theme switching
    await page.click('[data-testid="theme-toggle"]')

    // Check if theme changed (this would require checking CSS classes or theme context)
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Test Tab navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    // Test Enter key on navigation items
    await page.keyboard.press('Tab') // Navigate to first nav item
    await page.keyboard.press('Enter')

    // Should navigate to the selected section
    await expect(page).not.toHaveURL('/dashboard/main')
  })

  test('should display help tooltips', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for help buttons
    const helpButtons = await page.locator('[data-testid="help-button"]').count()
    if (helpButtons > 0) {
      await page.click('[data-testid="help-button"]:first-child')
      await expect(page.locator('[data-testid="tooltip"]')).toBeVisible()
    }
  })

  test('should show settings modal', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Click on user menu
    await page.click('[data-testid="user-menu"]')

    // Click on settings
    await page.click('[data-testid="settings-button"]')

    // Should show settings modal
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible()
  })

  test('should handle offline mode', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true)

    await page.goto('/dashboard/main')

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()

    // Should show cached data or appropriate message
    await expect(page.locator('text=You are offline')).toBeVisible()
  })

  test('should display data visualization charts', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for chart containers
    await expect(page.locator('[data-testid="chart-container"]')).toBeVisible()

    // Check for different chart types
    await expect(page.locator('[data-testid="productivity-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible()
  })

  test('should allow data export', async ({ page }) => {
    await page.goto('/dashboard/main')

    // Check for export buttons
    await expect(page.locator('[data-testid="export-button"]')).toBeVisible()

    // Test export functionality
    await page.click('[data-testid="export-button"]')
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()

    // Select export format
    await page.click('[data-testid="export-csv"]')
    await page.click('[data-testid="confirm-export"]')

    // Should trigger download
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible()
  })
})