/**
 * Start Server with Tests
 * 
 * This script runs the API tests before starting the server.
 * If all tests pass, the server will start normally.
 * If any tests fail, the server will not start.
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.magenta}Starting server with tests...${colors.reset}`);

// Run the tests
console.log(`${colors.blue}Running API tests...${colors.reset}`);

const testProcess = spawn('node', [path.join(__dirname, 'tests', 'api-test.js')], {
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`${colors.red}Tests failed with code ${code}. Server will not start.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}Tests passed! Starting server...${colors.reset}`);
  
  // Start the server
  const serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit'
  });
  
  serverProcess.on('close', (code) => {
    console.log(`${colors.yellow}Server exited with code ${code}${colors.reset}`);
    process.exit(code);
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log(`${colors.yellow}Received SIGINT. Shutting down...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`${colors.yellow}Received SIGTERM. Shutting down...${colors.reset}`);
  process.exit(0);
});
