/**
 * Fetch and analyze block-parented pages in parallel
 * 
 * This script identifies pages that are children of blocks,
 * then fetches their content in parallel.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

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

// Load all content data
const allContentPath = path.join(__dirname, 'notion-data', 'all-content.json');
const allContent = require(allContentPath);

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'notion-data', 'block-pages');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Main function
async function fetchBlockPages() {
  console.log(`${colors.magenta}Fetching Block-Parented Pages...${colors.reset}\n`);
  
  // Find pages that are children of blocks
  const blockPages = allContent.filter(item => 
    item.parent && item.parent.type === 'block_id'
  );
  
  console.log(`${colors.cyan}Found ${blockPages.length} pages that are children of blocks${colors.reset}`);
  
  // Display basic info about these pages
  blockPages.forEach((page, index) => {
    const title = page.properties?.title?.title?.[0]?.plain_text || 
                  page.properties?.Name?.title?.[0]?.plain_text || 
                  'Untitled';
    const parentBlockId = page.parent.block_id;
    console.log(`${colors.yellow}${index + 1}. ${title} (ID: ${page.id}, Parent Block: ${parentBlockId})${colors.reset}`);
  });
  
  // Fetch parent blocks to understand the context
  console.log(`\n${colors.cyan}Fetching parent blocks...${colors.reset}`);
  
  const parentBlockIds = [...new Set(blockPages.map(page => page.parent.block_id))];
  console.log(`${colors.blue}Found ${parentBlockIds.length} unique parent blocks${colors.reset}`);
  
  // Fetch each parent block in parallel
  const parentBlockPromises = parentBlockIds.map(async (blockId, index) => {
    try {
      console.log(`${colors.blue}Fetching parent block ${index + 1}/${parentBlockIds.length}: ${blockId}${colors.reset}`);
      const block = await notion.blocks.retrieve({ block_id: blockId });
      
      // Save the block data
      fs.writeFileSync(
        path.join(outputDir, `parent-block-${blockId}.json`),
        JSON.stringify(block, null, 2)
      );
      
      return {
        id: blockId,
        block,
        success: true
      };
    } catch (error) {
      console.error(`${colors.red}Error fetching block ${blockId}: ${error.message}${colors.reset}`);
      return {
        id: blockId,
        error: error.message,
        success: false
      };
    }
  });
  
  // Wait for all parent block fetches to complete
  const parentBlockResults = await Promise.all(parentBlockPromises);
  
  // Count successes and failures
  const successfulParentBlocks = parentBlockResults.filter(result => result.success);
  console.log(`${colors.green}Successfully fetched ${successfulParentBlocks.length}/${parentBlockIds.length} parent blocks${colors.reset}`);
  
  // Analyze the parent blocks
  console.log(`\n${colors.cyan}Analyzing parent blocks...${colors.reset}`);
  
  // Count by block type
  const blockTypes = {};
  successfulParentBlocks.forEach(result => {
    const type = result.block.type;
    blockTypes[type] = (blockTypes[type] || 0) + 1;
  });
  
  console.log(`${colors.yellow}Parent Block Types:${colors.reset}`);
  for (const [type, count] of Object.entries(blockTypes)) {
    console.log(`${type}: ${count}`);
  }
  
  // Now fetch the content of each block page in parallel
  console.log(`\n${colors.cyan}Fetching content of block-parented pages...${colors.reset}`);
  
  const pagePromises = blockPages.map(async (page, index) => {
    try {
      const pageId = page.id;
      const title = page.properties?.title?.title?.[0]?.plain_text || 
                    page.properties?.Name?.title?.[0]?.plain_text || 
                    'Untitled';
      
      console.log(`${colors.blue}Fetching page ${index + 1}/${blockPages.length}: ${title} (${pageId})${colors.reset}`);
      
      // Get page content (blocks)
      const blocks = await fetchPageBlocks(pageId);
      
      // Save the page data with its blocks
      const pageData = {
        page,
        blocks
      };
      
      fs.writeFileSync(
        path.join(outputDir, `page-${pageId}.json`),
        JSON.stringify(pageData, null, 2)
      );
      
      return {
        id: pageId,
        title,
        blockCount: blocks.length,
        success: true
      };
    } catch (error) {
      console.error(`${colors.red}Error fetching page ${page.id}: ${error.message}${colors.reset}`);
      return {
        id: page.id,
        error: error.message,
        success: false
      };
    }
  });
  
  // Wait for all page fetches to complete
  const pageResults = await Promise.all(pagePromises);
  
  // Count successes and failures
  const successfulPages = pageResults.filter(result => result.success);
  console.log(`${colors.green}Successfully fetched ${successfulPages.length}/${blockPages.length} pages${colors.reset}`);
  
  // Display results
  console.log(`\n${colors.cyan}Page Content Summary:${colors.reset}`);
  successfulPages.forEach((result, index) => {
    console.log(`${colors.yellow}${index + 1}. ${result.title} (${result.id}): ${result.blockCount} blocks${colors.reset}`);
  });
  
  // Create a summary file
  const summary = {
    totalBlockPages: blockPages.length,
    successfulFetches: successfulPages.length,
    parentBlocks: {
      total: parentBlockIds.length,
      successful: successfulParentBlocks.length,
      types: blockTypes
    },
    pages: pageResults,
    fetchedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n${colors.green}Analysis complete! Data saved to notion-data/block-pages directory${colors.reset}`);
}

// Helper function to fetch all blocks for a page
async function fetchPageBlocks(pageId) {
  const blocks = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    try {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: startCursor
      });
      
      blocks.push(...response.results);
      
      hasMore = response.has_more;
      startCursor = response.next_cursor;
      
      // Add a small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error fetching blocks for page ${pageId}: ${error.message}`);
      hasMore = false;
    }
  }
  
  return blocks;
}

// Run the function
fetchBlockPages()
  .then(() => {
    console.log(`${colors.green}Script completed successfully${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Error running script: ${error.message}${colors.reset}`);
    process.exit(1);
  });
