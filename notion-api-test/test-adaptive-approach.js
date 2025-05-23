/**
 * Test Script for Adaptive Notion Approach
 * 
 * This script tests the adaptive approach to Notion integration
 * that works with workspaces where titles may not be accessible.
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

// Adaptive Structure class
class AdaptiveStructure {
  constructor() {
    this.initialized = false;
    this.pageHierarchy = {};
    this.topLevelPages = [];
    this.pageChildren = {};
    this.pageParents = {};
    this.frequentlyAccessedPages = new Map(); // For tracking usage
  }
  
  /**
   * Initialize the adaptive structure
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      console.log(`${colors.blue}Initializing adaptive structure...${colors.reset}`);
      
      // Build initial hierarchy (lightweight)
      await this.buildInitialHierarchy();
      
      this.initialized = true;
      console.log(`${colors.green}Adaptive structure initialized with ${this.topLevelPages.length} top-level pages${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error initializing adaptive structure: ${error.message}${colors.reset}`);
      throw error;
    }
  }
  
  /**
   * Build the initial hierarchy (lightweight)
   */
  async buildInitialHierarchy() {
    // Get all pages (just metadata)
    const pages = await this.getAllPageMetadata();
    console.log(`${colors.green}Retrieved ${pages.length} pages from Notion${colors.reset}`);
    
    // Process parent-child relationships
    for (const page of pages) {
      const pageId = page.id;
      
      // Track parent-child relationships
      if (page.parent) {
        const parentType = page.parent.type;
        
        if (parentType === 'page_id') {
          const parentId = page.parent.page_id;
          
          // Add to parent's children
          if (!this.pageChildren[parentId]) {
            this.pageChildren[parentId] = [];
          }
          this.pageChildren[parentId].push(pageId);
          
          // Track page's parent
          this.pageParents[pageId] = parentId;
        } else if (parentType === 'workspace') {
          // This is a top-level page
          this.topLevelPages.push(pageId);
        }
      }
    }
    
    console.log(`${colors.blue}Found ${this.topLevelPages.length} top-level pages${colors.reset}`);
    console.log(`${colors.blue}Built parent-child relationships for ${Object.keys(this.pageChildren).length} parent pages${colors.reset}`);
  }
  
  /**
   * Get all page metadata from Notion
   */
  async getAllPageMetadata() {
    const pages = [];
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      try {
        const response = await notion.search({
          start_cursor: startCursor,
          page_size: 100,
          filter: {
            property: 'object',
            value: 'page'
          }
        });
        
        pages.push(...response.results);
        
        hasMore = response.has_more;
        startCursor = response.next_cursor;
        
        // Add a small delay to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`${colors.red}Error fetching page metadata: ${error.message}${colors.reset}`);
        hasMore = false;
      }
    }
    
    return pages;
  }
  
  /**
   * Get children of a page
   */
  async getPageChildren(pageId) {
    // Check if we already have the children
    if (this.pageChildren[pageId]) {
      return this.pageChildren[pageId];
    }
    
    // If not, try to get them from the API
    try {
      const response = await notion.blocks.children.list({
        block_id: pageId
      });
      const blocks = response.results || [];
      
      // Look for child page blocks
      const childPages = [];
      for (const block of blocks) {
        if (block.type === 'child_page') {
          childPages.push(block.id);
        }
      }
      
      // Cache the result
      this.pageChildren[pageId] = childPages;
      
      // Update parent relationships
      for (const childId of childPages) {
        this.pageParents[childId] = pageId;
      }
      
      return childPages;
    } catch (error) {
      console.error(`${colors.red}Error getting children for page ${pageId}: ${error.message}${colors.reset}`);
      return [];
    }
  }
  
  /**
   * Get the path to a page (breadcrumbs)
   */
  async getPathToPage(pageId) {
    const path = [];
    let currentId = pageId;
    
    // Prevent infinite loops
    const visited = new Set();
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      path.unshift(currentId);
      
      // Get parent
      currentId = this.pageParents[currentId];
    }
    
    return path;
  }
  
  /**
   * Find related pages (siblings and cousins)
   */
  async findRelatedPages(pageId) {
    const related = new Set();
    
    // Get parent
    const parentId = this.pageParents[pageId];
    if (!parentId) {
      return Array.from(related);
    }
    
    // Get siblings (other children of the same parent)
    const siblings = this.pageChildren[parentId] || [];
    for (const siblingId of siblings) {
      if (siblingId !== pageId) {
        related.add(siblingId);
      }
    }
    
    // Get grandparent
    const grandparentId = this.pageParents[parentId];
    if (grandparentId) {
      // Get aunts/uncles (other children of the grandparent)
      const auntsUncles = this.pageChildren[grandparentId] || [];
      for (const auntUncleId of auntsUncles) {
        if (auntUncleId !== parentId) {
          // Get cousins (children of aunts/uncles)
          const cousins = this.pageChildren[auntUncleId] || [];
          for (const cousinId of cousins) {
            related.add(cousinId);
          }
        }
      }
    }
    
    return Array.from(related);
  }
  
  /**
   * Track page access (for frequency-based optimization)
   */
  trackPageAccess(pageId) {
    const count = this.frequentlyAccessedPages.get(pageId) || 0;
    this.frequentlyAccessedPages.set(pageId, count + 1);
    
    // Ensure we have this page's children
    if (!this.pageChildren[pageId]) {
      this.getPageChildren(pageId).catch(error => {
        console.error(`${colors.red}Error getting children while tracking access for ${pageId}: ${error.message}${colors.reset}`);
      });
    }
  }
  
  /**
   * Get frequently accessed pages
   */
  getFrequentlyAccessedPages(limit = 10) {
    return Array.from(this.frequentlyAccessedPages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pageId]) => pageId);
  }
}

// Helper function to get page title
function getPageTitle(page) {
  if (page.properties && page.properties.title && page.properties.title.title) {
    return page.properties.title.title.map(t => t.plain_text).join('');
  } else if (page.properties && page.properties.Name && page.properties.Name.title) {
    return page.properties.Name.title.map(t => t.plain_text).join('');
  }
  return 'Untitled';
}

// Main test function
async function testAdaptiveApproach() {
  console.log(`${colors.magenta}Testing Adaptive Notion Approach${colors.reset}\n`);
  
  try {
    // Step 1: Initialize the adaptive structure
    const adaptiveStructure = new AdaptiveStructure();
    await adaptiveStructure.initialize();
    
    // Step 2: Test getting page children
    console.log(`\n${colors.cyan}Step 2: Testing page children retrieval...${colors.reset}`);
    
    // Get a parent page with children
    const parentPages = Object.entries(adaptiveStructure.pageChildren)
      .sort((a, b) => b[1].length - a[1].length);
    
    if (parentPages.length > 0) {
      const [parentId, children] = parentPages[0];
      console.log(`${colors.blue}Testing with parent page ${parentId} (${children.length} children)${colors.reset}`);
      
      // Get page info
      const parentPage = await notion.pages.retrieve({ page_id: parentId });
      const parentTitle = getPageTitle(parentPage);
      console.log(`${colors.blue}Parent title: ${parentTitle}${colors.reset}`);
      
      // Get children
      const retrievedChildren = await adaptiveStructure.getPageChildren(parentId);
      console.log(`${colors.green}Retrieved ${retrievedChildren.length} children${colors.reset}`);
      
      // Get info for first child
      if (retrievedChildren.length > 0) {
        const childId = retrievedChildren[0];
        const childPage = await notion.pages.retrieve({ page_id: childId });
        const childTitle = getPageTitle(childPage);
        console.log(`${colors.blue}First child: ${childTitle} (${childId})${colors.reset}`);
        
        // Step 3: Test path to page
        console.log(`\n${colors.cyan}Step 3: Testing path to page...${colors.reset}`);
        const path = await adaptiveStructure.getPathToPage(childId);
        console.log(`${colors.green}Path length: ${path.length}${colors.reset}`);
        console.log(`${colors.blue}Path: ${path.join(' > ')}${colors.reset}`);
        
        // Step 4: Test finding related pages
        console.log(`\n${colors.cyan}Step 4: Testing related pages...${colors.reset}`);
        const related = await adaptiveStructure.findRelatedPages(childId);
        console.log(`${colors.green}Found ${related.length} related pages${colors.reset}`);
        
        if (related.length > 0) {
          // Get info for first related page
          const relatedId = related[0];
          const relatedPage = await notion.pages.retrieve({ page_id: relatedId });
          const relatedTitle = getPageTitle(relatedPage);
          console.log(`${colors.blue}First related page: ${relatedTitle} (${relatedId})${colors.reset}`);
        }
        
        // Step 5: Test tracking page access
        console.log(`\n${colors.cyan}Step 5: Testing page access tracking...${colors.reset}`);
        adaptiveStructure.trackPageAccess(childId);
        adaptiveStructure.trackPageAccess(childId);
        adaptiveStructure.trackPageAccess(parentId);
        
        const frequentPages = adaptiveStructure.getFrequentlyAccessedPages(3);
        console.log(`${colors.green}Top 3 frequently accessed pages:${colors.reset}`);
        for (const pageId of frequentPages) {
          const count = adaptiveStructure.frequentlyAccessedPages.get(pageId);
          console.log(`${colors.blue}${pageId}: ${count} accesses${colors.reset}`);
        }
      }
    }
    
    console.log(`\n${colors.green}All tests completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error testing adaptive approach: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

// Run the test
testAdaptiveApproach()
  .then(() => {
    console.log(`${colors.green}Test script completed${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
