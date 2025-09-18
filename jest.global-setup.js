/**
 * Jest Global Setup
 * Runs once before all test suites
 */

module.exports = async () => {
  // Global setup for all test suites
  console.log('🚀 Setting up test environment...')

  // Initialize test database connections if needed
  // await setupTestDatabase()

  // Load environment variables for testing
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

  // Setup global test configurations
  global.__TEST__ = true

  console.log('✅ Test environment setup complete')
}