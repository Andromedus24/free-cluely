/**
 * Jest Global Teardown
 * Runs once after all test suites
 */

module.exports = async () => {
  // Global cleanup after all test suites
  console.log('🧹 Cleaning up test environment...')

  // Close database connections
  // await cleanupTestDatabase()

  // Clear any global state
  delete global.__TEST__

  console.log('✅ Test environment cleanup complete')
}