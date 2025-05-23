/**
 * Notion API Test Script
 * 
 * This script tests the Notion API connection and retrieves basic information
 * about the workspace to verify that the API key is working correctly.
 */

// Import required modules
require('dotenv').config();
const { Client } = require('@notionhq/client');

// Initialize Notion client with API key from .env
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

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

// Main test function
async function testNotionAPI() {
  console.log(`${colors.magenta}Starting Notion API Test...${colors.reset}`);
  
  // Check if API key is configured
  if (!process.env.NOTION_API_KEY) {
    console.error(`${colors.red}Error: NOTION_API_KEY is not set in .env file${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.blue}API Key found in environment variables${colors.reset}`);
  
  try {
    // Test 1: List all users
    console.log(`\n${colors.cyan}Test 1: Listing users...${colors.reset}`);
    const usersResponse = await notion.users.list();
    
    if (usersResponse.results && usersResponse.results.length > 0) {
      console.log(`${colors.green}✓ Successfully retrieved ${usersResponse.results.length} users${colors.reset}`);
      console.log(`${colors.yellow}First user: ${usersResponse.results[0].name} (${usersResponse.results[0].type})${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ No users found, but API connection successful${colors.reset}`);
    }
    
    // Test 2: Search for content
    console.log(`\n${colors.cyan}Test 2: Searching for content...${colors.reset}`);
    const searchResponse = await notion.search({
      query: '',
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      },
      page_size: 10
    });
    
    if (searchResponse.results && searchResponse.results.length > 0) {
      console.log(`${colors.green}✓ Successfully retrieved ${searchResponse.results.length} results${colors.reset}`);
      
      // Display the first few results
      console.log(`\n${colors.yellow}Recent content:${colors.reset}`);
      searchResponse.results.slice(0, 5).forEach((item, index) => {
        const title = getTitle(item);
        console.log(`${colors.yellow}${index + 1}. ${title} (${item.object} - ${item.id})${colors.reset}`);
      });
    } else {
      console.log(`${colors.yellow}⚠ No content found, but API connection successful${colors.reset}`);
    }
    
    // Test 3: List all databases
    console.log(`\n${colors.cyan}Test 3: Finding databases...${colors.reset}`);
    const databases = searchResponse.results.filter(item => item.object === 'database');
    
    if (databases.length > 0) {
      console.log(`${colors.green}✓ Found ${databases.length} databases${colors.reset}`);
      
      // Display database info
      console.log(`\n${colors.yellow}Databases:${colors.reset}`);
      databases.forEach((db, index) => {
        const title = getTitle(db);
        console.log(`${colors.yellow}${index + 1}. ${title} (${db.id})${colors.reset}`);
      });
      
      // If there's at least one database, try to query it
      if (databases.length > 0) {
        const firstDbId = databases[0].id;
        console.log(`\n${colors.cyan}Test 4: Querying first database (${firstDbId})...${colors.reset}`);
        
        try {
          const dbItems = await notion.databases.query({
            database_id: firstDbId,
            page_size: 5
          });
          
          console.log(`${colors.green}✓ Successfully queried database with ${dbItems.results.length} items${colors.reset}`);
        } catch (dbError) {
          console.error(`${colors.red}✗ Error querying database: ${dbError.message}${colors.reset}`);
        }
      }
    } else {
      console.log(`${colors.yellow}⚠ No databases found${colors.reset}`);
    }
    
    console.log(`\n${colors.green}All tests completed successfully! Your Notion API key is working.${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error testing Notion API: ${error.message}${colors.reset}`);
    
    if (error.code === 'unauthorized') {
      console.error(`${colors.red}The API key appears to be invalid or has insufficient permissions.${colors.reset}`);
      console.error(`${colors.yellow}Make sure you've created a Notion integration and shared your pages/databases with it.${colors.reset}`);
    }
    
    return false;
  }
}

// Helper function to extract title from different Notion objects
function getTitle(item) {
  if (item.object === 'page') {
    // For pages, title might be in properties.title or properties.Name
    if (item.properties && item.properties.title && item.properties.title.title) {
      return item.properties.title.title.map(t => t.plain_text).join('');
    } else if (item.properties && item.properties.Name && item.properties.Name.title) {
      return item.properties.Name.title.map(t => t.plain_text).join('');
    } else {
      return 'Untitled Page';
    }
  } else if (item.object === 'database') {
    // For databases, title is in title property
    if (item.title && Array.isArray(item.title)) {
      return item.title.map(t => t.plain_text).join('');
    } else {
      return 'Untitled Database';
    }
  } else {
    return `${item.object} (no title)`;
  }
}

// Run the test
testNotionAPI()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
