/**
 * Comprehensive Notion Content Fetcher
 * 
 * This script fetches all available content from a Notion workspace
 * and saves it to a JSON file for inspection.
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

// Main function to fetch all content
async function fetchAllNotionContent() {
  console.log(`${colors.magenta}Starting comprehensive Notion content fetch...${colors.reset}`);
  
  // Check if API key is configured
  if (!process.env.NOTION_API_KEY) {
    console.error(`${colors.red}Error: NOTION_API_KEY is not set in .env file${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.blue}API Key found in environment variables${colors.reset}`);
  
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'notion-data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Step 1: Fetch all users
    console.log(`\n${colors.cyan}Step 1: Fetching all users...${colors.reset}`);
    const users = await fetchAllUsers();
    console.log(`${colors.green}✓ Retrieved ${users.length} users${colors.reset}`);
    
    // Save users to file
    fs.writeFileSync(
      path.join(outputDir, 'users.json'), 
      JSON.stringify(users, null, 2)
    );
    console.log(`${colors.green}✓ Saved users to notion-data/users.json${colors.reset}`);
    
    // Step 2: Fetch all pages and databases
    console.log(`\n${colors.cyan}Step 2: Fetching all pages and databases...${colors.reset}`);
    const allContent = await fetchAllContent();
    console.log(`${colors.green}✓ Retrieved ${allContent.length} total items${colors.reset}`);
    
    // Count by type
    const pages = allContent.filter(item => item.object === 'page');
    const databases = allContent.filter(item => item.object === 'database');
    console.log(`${colors.yellow}Pages: ${pages.length}, Databases: ${databases.length}${colors.reset}`);
    
    // Save all content to file
    fs.writeFileSync(
      path.join(outputDir, 'all-content.json'), 
      JSON.stringify(allContent, null, 2)
    );
    console.log(`${colors.green}✓ Saved all content to notion-data/all-content.json${colors.reset}`);
    
    // Step 3: Fetch database contents (if any databases exist)
    if (databases.length > 0) {
      console.log(`\n${colors.cyan}Step 3: Fetching contents of ${databases.length} databases...${colors.reset}`);
      
      const databasesDir = path.join(outputDir, 'databases');
      if (!fs.existsSync(databasesDir)) {
        fs.mkdirSync(databasesDir);
      }
      
      for (let i = 0; i < databases.length; i++) {
        const db = databases[i];
        const dbTitle = getTitle(db) || `Database_${i+1}`;
        console.log(`${colors.yellow}Fetching database ${i+1}/${databases.length}: ${dbTitle}${colors.reset}`);
        
        try {
          const dbContents = await fetchDatabaseContents(db.id);
          
          // Save database contents to file
          const safeTitle = dbTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          fs.writeFileSync(
            path.join(databasesDir, `${safeTitle}_${db.id}.json`), 
            JSON.stringify(dbContents, null, 2)
          );
          console.log(`${colors.green}✓ Saved database contents (${dbContents.length} items)${colors.reset}`);
        } catch (dbError) {
          console.error(`${colors.red}✗ Error fetching database contents: ${dbError.message}${colors.reset}`);
        }
      }
    } else {
      console.log(`${colors.yellow}No databases found, skipping database content fetch${colors.reset}`);
    }
    
    // Step 4: Fetch page contents for a sample of pages
    console.log(`\n${colors.cyan}Step 4: Fetching detailed content for sample pages...${colors.reset}`);
    
    const pagesDir = path.join(outputDir, 'pages');
    if (!fs.existsSync(pagesDir)) {
      fs.mkdirSync(pagesDir);
    }
    
    // Limit to 10 pages for the sample
    const pageSample = pages.slice(0, 10);
    
    for (let i = 0; i < pageSample.length; i++) {
      const page = pageSample[i];
      const pageTitle = getTitle(page) || `Page_${i+1}`;
      console.log(`${colors.yellow}Fetching page ${i+1}/${pageSample.length}: ${pageTitle}${colors.reset}`);
      
      try {
        const pageContent = await fetchPageContent(page.id);
        
        // Save page contents to file
        const safeTitle = pageTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        fs.writeFileSync(
          path.join(pagesDir, `${safeTitle}_${page.id}.json`), 
          JSON.stringify(pageContent, null, 2)
        );
        console.log(`${colors.green}✓ Saved page content${colors.reset}`);
      } catch (pageError) {
        console.error(`${colors.red}✗ Error fetching page content: ${pageError.message}${colors.reset}`);
      }
    }
    
    // Create a summary file
    const summary = {
      totalItems: allContent.length,
      pages: pages.length,
      databases: databases.length,
      users: users.length,
      fetchedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'summary.json'), 
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n${colors.green}All content fetched successfully!${colors.reset}`);
    console.log(`${colors.green}Data saved to the notion-data directory${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error fetching Notion content: ${error.message}${colors.reset}`);
    return false;
  }
}

// Fetch all users
async function fetchAllUsers() {
  const users = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.users.list({
      start_cursor: startCursor
    });
    
    users.push(...response.results);
    
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }
  
  return users;
}

// Fetch all content (pages and databases)
async function fetchAllContent() {
  const allContent = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.search({
      start_cursor: startCursor,
      page_size: 100 // Maximum allowed by the API
    });
    
    allContent.push(...response.results);
    console.log(`${colors.blue}Fetched ${response.results.length} items (total: ${allContent.length})${colors.reset}`);
    
    hasMore = response.has_more;
    startCursor = response.next_cursor;
    
    // Add a small delay to avoid rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allContent;
}

// Fetch all items from a database
async function fetchDatabaseContents(databaseId) {
  const items = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      page_size: 100 // Maximum allowed by the API
    });
    
    items.push(...response.results);
    
    hasMore = response.has_more;
    startCursor = response.next_cursor;
    
    // Add a small delay to avoid rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return items;
}

// Fetch page content including blocks
async function fetchPageContent(pageId) {
  // First get the page itself
  const page = await notion.pages.retrieve({ page_id: pageId });
  
  // Then get the page blocks (content)
  const blocks = await fetchAllBlocksForPage(pageId);
  
  return {
    page,
    blocks
  };
}

// Fetch all blocks for a page (recursive)
async function fetchAllBlocksForPage(blockId, depth = 0) {
  if (depth > 5) {
    return []; // Limit recursion depth
  }
  
  const blocks = [];
  let hasMore = true;
  let startCursor = undefined;
  
  while (hasMore) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: startCursor
    });
    
    // Process each block
    for (const block of response.results) {
      blocks.push(block);
      
      // If the block has children, fetch them recursively
      if (block.has_children) {
        block.children = await fetchAllBlocksForPage(block.id, depth + 1);
      }
    }
    
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }
  
  return blocks;
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

// Run the fetch operation
fetchAllNotionContent()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
