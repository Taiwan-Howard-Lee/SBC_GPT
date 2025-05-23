/**
 * Test Script for Notion Integration
 * 
 * This script tests the new structured Notion integration.
 */

require('dotenv').config();
const NotionAgent = require('../agents/notionAgent');
const pageMapper = require('../integrations/notion/pageMapper');
const structuredSearch = require('../integrations/notion/structuredSearch');
const twoStageRetrieval = require('../integrations/notion/twoStageRetrieval');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Main test function
 */
async function testNotionIntegration() {
  console.log(`${colors.magenta}Testing Notion Integration${colors.reset}\n`);
  
  try {
    // Step 1: Initialize the page mapper
    console.log(`${colors.cyan}Step 1: Initializing page mapper...${colors.reset}`);
    await pageMapper.initialize();
    console.log(`${colors.green}✓ Page mapper initialized successfully${colors.reset}`);
    
    // Print some stats
    const pageIdMap = pageMapper.pageIdMap;
    const pageCount = Object.keys(pageIdMap).length;
    console.log(`${colors.blue}Found ${pageCount} pages in the workspace${colors.reset}`);
    
    // Count by type
    const typeCounts = {};
    for (const mapping of Object.values(pageIdMap)) {
      typeCounts[mapping.type] = (typeCounts[mapping.type] || 0) + 1;
    }
    
    console.log(`${colors.blue}Page types:${colors.reset}`);
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`  ${type}: ${count}`);
    }
    
    // Step 2: Initialize the structured search
    console.log(`\n${colors.cyan}Step 2: Initializing structured search...${colors.reset}`);
    await structuredSearch.initialize();
    console.log(`${colors.green}✓ Structured search initialized successfully${colors.reset}`);
    
    // Step 3: Initialize the two-stage retrieval
    console.log(`\n${colors.cyan}Step 3: Initializing two-stage retrieval...${colors.reset}`);
    await twoStageRetrieval.initialize();
    console.log(`${colors.green}✓ Two-stage retrieval initialized successfully${colors.reset}`);
    
    // Step 4: Test a search query
    console.log(`\n${colors.cyan}Step 4: Testing search query...${colors.reset}`);
    const testQuery = 'What is our process for accounting?';
    console.log(`${colors.blue}Query: "${testQuery}"${colors.reset}`);
    
    const potentialSources = await twoStageRetrieval.findPotentialSources(testQuery);
    console.log(`${colors.green}✓ Found ${potentialSources.length} potential sources${colors.reset}`);
    
    // Print the sources
    console.log(`${colors.blue}Potential sources:${colors.reset}`);
    potentialSources.forEach((source, index) => {
      console.log(`${colors.yellow}${index + 1}. ${source.title} (${source.path})${colors.reset}`);
      console.log(`   Preview: ${source.preview}`);
    });
    
    // Step 5: Test detailed retrieval
    if (potentialSources.length > 0) {
      console.log(`\n${colors.cyan}Step 5: Testing detailed retrieval...${colors.reset}`);
      const sourceId = potentialSources[0].id;
      console.log(`${colors.blue}Getting detailed content for: ${potentialSources[0].title}${colors.reset}`);
      
      const detailedContent = await twoStageRetrieval.getDetailedContent(sourceId, testQuery);
      console.log(`${colors.green}✓ Retrieved detailed content successfully${colors.reset}`);
      
      // Print some info about the detailed content
      console.log(`${colors.blue}Title: ${detailedContent.title}${colors.reset}`);
      console.log(`${colors.blue}Path: ${detailedContent.path}${colors.reset}`);
      console.log(`${colors.blue}Document Type: ${detailedContent.documentType}${colors.reset}`);
      console.log(`${colors.blue}Content Length: ${detailedContent.content.length} characters${colors.reset}`);
      
      if (detailedContent.relatedPages && detailedContent.relatedPages.length > 0) {
        console.log(`${colors.blue}Related Pages: ${detailedContent.relatedPages.length}${colors.reset}`);
        detailedContent.relatedPages.forEach((page, index) => {
          console.log(`  ${index + 1}. ${page.title}`);
        });
      }
    }
    
    // Step 6: Test the Notion agent
    console.log(`\n${colors.cyan}Step 6: Testing Notion agent...${colors.reset}`);
    const notionAgent = new NotionAgent();
    console.log(`${colors.blue}Initializing Notion agent...${colors.reset}`);
    
    // Test canHandle
    const canHandle = await notionAgent.canHandle(testQuery);
    console.log(`${colors.blue}Can handle query: ${canHandle}${colors.reset}`);
    
    // Test processQuery
    console.log(`${colors.blue}Processing query...${colors.reset}`);
    const response = await notionAgent.processQuery(testQuery);
    console.log(`${colors.green}✓ Query processed successfully${colors.reset}`);
    
    // Print the response
    console.log(`${colors.yellow}Response:${colors.reset}`);
    console.log(response.message);
    
    console.log(`\n${colors.green}All tests completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error testing Notion integration: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

// Run the test
testNotionIntegration()
  .then(() => {
    console.log(`${colors.green}Test script completed${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
