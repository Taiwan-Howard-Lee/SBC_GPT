/**
 * API Test Module
 * 
 * This module exports test functions for API endpoints to ensure they're working correctly
 * before starting the server.
 */

const { processMessage } = require('../services/geminiService');
const { processAgentResponse } = require('../services/centralChatbotService');
const notionAgent = require('../agents/notionAgent');
const notionCache = require('../integrations/notion/cache');

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

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * Run a test and log the result
 * @param {string} name - The name of the test
 * @param {Function} testFn - The test function to run
 */
async function runTest(name, testFn) {
  results.total++;
  console.log(`\n${colors.cyan}Running test: ${name}${colors.reset}`);
  
  try {
    await testFn();
    console.log(`${colors.green}✓ Test passed: ${name}${colors.reset}`);
    results.passed++;
  } catch (error) {
    console.error(`${colors.red}✗ Test failed: ${name}${colors.reset}`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    results.failed++;
  }
}

/**
 * Test the Gemini API integration
 */
async function testGeminiAPI() {
  console.log(`${colors.blue}Testing Gemini API integration...${colors.reset}`);
  
  const messages = [
    { role: 'user', content: 'Hello, who are you?' }
  ];
  
  const response = await processMessage(messages);
  
  if (!response || !response.content) {
    throw new Error('No response from Gemini API');
  }
  
  console.log(`${colors.yellow}Gemini API response: ${response.content.substring(0, 100)}...${colors.reset}`);
}

/**
 * Test the Central Chatbot Service
 */
async function testCentralChatbot() {
  console.log(`${colors.blue}Testing Central Chatbot Service...${colors.reset}`);
  
  const userQuery = 'What services does SBC Australia offer?';
  const agentResponse = {
    message: 'SBC Australia offers business consulting services including strategic planning, market analysis, and operational optimization.',
    source: 'Knowledge Base',
    success: true
  };
  
  const response = await processAgentResponse(userQuery, agentResponse);
  
  if (!response || !response.content) {
    throw new Error('No response from Central Chatbot Service');
  }
  
  console.log(`${colors.yellow}Central Chatbot response: ${response.content.substring(0, 100)}...${colors.reset}`);
}

/**
 * Test the Notion Agent
 */
async function testNotionAgent() {
  console.log(`${colors.blue}Testing Notion Agent...${colors.reset}`);
  
  // Check if Notion Agent is configured
  if (!notionAgent.isConfigured) {
    console.log(`${colors.yellow}Notion Agent is not configured, skipping test${colors.reset}`);
    return;
  }
  
  // Test extracting search terms
  const searchTerms = await notionAgent.extractSearchTerms('Tell me about SBC Australia');
  
  if (!searchTerms) {
    throw new Error('Failed to extract search terms');
  }
  
  console.log(`${colors.yellow}Extracted search terms: ${searchTerms}${colors.reset}`);
}

/**
 * Test the Notion Cache
 */
async function testNotionCache() {
  console.log(`${colors.blue}Testing Notion Cache...${colors.reset}`);
  
  // Check if cache is initialized
  if (notionCache.isInitialized) {
    console.log(`${colors.yellow}Notion Cache is already initialized${colors.reset}`);
    
    // Get the number of pages in the cache
    const pageCount = notionCache.pages.size;
    console.log(`${colors.yellow}Pages in cache: ${pageCount}${colors.reset}`);
    
    return;
  }
  
  console.log(`${colors.yellow}Notion Cache is not initialized, initializing...${colors.reset}`);
  
  // Initialize the cache
  const success = await notionCache.initialize();
  
  if (!success) {
    console.log(`${colors.yellow}Notion Cache initialization failed, but this is not critical${colors.reset}`);
    return;
  }
  
  console.log(`${colors.yellow}Notion Cache initialized successfully${colors.reset}`);
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`${colors.magenta}Starting API tests...${colors.reset}`);
  
  await runTest('Gemini API', testGeminiAPI);
  await runTest('Central Chatbot', testCentralChatbot);
  await runTest('Notion Agent', testNotionAgent);
  await runTest('Notion Cache', testNotionCache);
  
  // Print summary
  console.log(`\n${colors.magenta}Test Summary:${colors.reset}`);
  console.log(`${colors.cyan}Total tests: ${results.total}${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}Some tests failed. Please fix the issues before starting the server.${colors.reset}`);
    throw new Error('Tests failed');
  } else {
    console.log(`\n${colors.green}All tests passed! The server is ready to start.${colors.reset}`);
    return true;
  }
}

// Export the test functions
module.exports = {
  runAllTests,
  testGeminiAPI,
  testCentralChatbot,
  testNotionAgent,
  testNotionCache
};
