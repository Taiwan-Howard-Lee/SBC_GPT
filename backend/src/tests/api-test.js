/**
 * API Test Script
 *
 * This script tests all key API endpoints to ensure they're working correctly.
 * It can be run independently using 'npm test' or automatically during server startup.
 */

// Import the test module
const { runAllTests } = require('./api-test-module');

// Run the tests
runAllTests().catch(error => {
  console.error(`Error running tests: ${error.message}`);
  process.exit(1);
});
