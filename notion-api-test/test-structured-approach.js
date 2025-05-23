/**
 * Test Script for Structured Notion Approach
 * 
 * This script tests the structured approach to Notion integration
 * with hardcoded structure, page mapping, and two-stage retrieval.
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

// Hardcoded workspace structure
const WORKSPACE_STRUCTURE = {
  // Main sections of the workspace
  sections: {
    'accounting_finance': {
      title: 'Accounting / Finance',
      documentType: 'SECTION',
      childTypes: ['PROCEDURE', 'POLICY', 'CONTACT_LIST', 'FORM'],
      keyTerms: ['budget', 'expense', 'invoice', 'payment', 'accounting', 'finance', 'financial', 'money', 'fund'],
      // Known child pages
      children: [
        'company_information',
        'bank_accounts',
        'insurance',
        'compliance',
        'australian_financial_services_license',
        'investment_trusts_and_funds',
        'startup_valuation_policy',
        'fund_management',
        'startup_investment_payments',
        'supplier_and_contractors',
        'client_contracts_and_invoicing',
        'payroll',
        'staff_expense_management',
        'end_of_month_process',
        'grant_tracking_and_acquittals',
        'sales_startup_terms'
      ]
    }
  },
  
  // Document types and their characteristics
  documentTypes: {
    'POLICY': {
      keyTerms: ['policy', 'guideline', 'rule', 'requirement', 'standard', 'protocol'],
      importance: 'high',
      contentStructure: 'formal'
    },
    'PROCEDURE': {
      keyTerms: ['procedure', 'process', 'step', 'how to', 'workflow', 'method', 'instruction'],
      importance: 'high',
      contentStructure: 'sequential'
    },
    'CONTACT_LIST': {
      keyTerms: ['contact', 'email', 'phone', 'person', 'team', 'directory', 'staff'],
      importance: 'medium',
      contentStructure: 'list'
    },
    'FORM': {
      keyTerms: ['form', 'template', 'fill', 'submit', 'application', 'document'],
      importance: 'medium',
      contentStructure: 'template'
    },
    'GENERAL_INFO': {
      keyTerms: ['information', 'about', 'overview', 'summary', 'description', 'details'],
      importance: 'medium',
      contentStructure: 'informational'
    }
  }
};

// Page Mapper class
class PageMapper {
  constructor() {
    this.pageIdMap = {};
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    console.log(`${colors.blue}Initializing page mapper...${colors.reset}`);
    
    try {
      // Get all pages
      const pages = await this.getAllPages();
      console.log(`${colors.green}Retrieved ${pages.length} pages from Notion${colors.reset}`);
      
      // Map pages to our structure
      for (const page of pages) {
        const pageId = page.id;
        const pageTitle = this.getPageTitle(page);
        
        // Try to match to our known structure
        let matched = false;
        
        // Check if it's a main section
        for (const [sectionKey, section] of Object.entries(WORKSPACE_STRUCTURE.sections)) {
          if (this.titleMatches(pageTitle, section.title)) {
            this.pageIdMap[pageId] = {
              type: 'SECTION',
              key: sectionKey,
              title: pageTitle,
              parent: page.parent
            };
            matched = true;
            break;
          }
          
          // Check if it's a known child page
          for (const childKey of section.children) {
            const childTitle = childKey.replace(/_/g, ' ');
            if (this.titleMatches(pageTitle, childTitle)) {
              this.pageIdMap[pageId] = {
                type: 'CHILD_PAGE',
                key: childKey,
                parentSection: sectionKey,
                title: pageTitle,
                parent: page.parent
              };
              matched = true;
              break;
            }
          }
          
          if (matched) break;
        }
        
        // If not matched to known structure, classify by content
        if (!matched) {
          // Simple classification based on title
          let documentType = 'GENERAL_INFO';
          
          for (const [typeKey, typeInfo] of Object.entries(WORKSPACE_STRUCTURE.documentTypes)) {
            for (const term of typeInfo.keyTerms) {
              if (pageTitle.toLowerCase().includes(term)) {
                documentType = typeKey;
                break;
              }
            }
          }
          
          this.pageIdMap[pageId] = {
            type: 'UNKNOWN_PAGE',
            documentType,
            title: pageTitle,
            parent: page.parent
          };
        }
      }
      
      this.initialized = true;
      
      // Count by type
      const typeCounts = {};
      for (const mapping of Object.values(this.pageIdMap)) {
        typeCounts[mapping.type] = (typeCounts[mapping.type] || 0) + 1;
      }
      
      console.log(`${colors.green}Page mapper initialized with ${Object.keys(this.pageIdMap).length} pages${colors.reset}`);
      console.log(`${colors.blue}Page types:${colors.reset}`);
      for (const [type, count] of Object.entries(typeCounts)) {
        console.log(`  ${type}: ${count}`);
      }
    } catch (error) {
      console.error(`${colors.red}Error initializing page mapper: ${error.message}${colors.reset}`);
      throw error;
    }
  }
  
  async getAllPages() {
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
        console.error(`${colors.red}Error fetching pages: ${error.message}${colors.reset}`);
        hasMore = false;
      }
    }
    
    return pages;
  }
  
  getPageTitle(page) {
    if (page.properties && page.properties.title && page.properties.title.title) {
      return page.properties.title.title.map(t => t.plain_text).join('');
    } else if (page.properties && page.properties.Name && page.properties.Name.title) {
      return page.properties.Name.title.map(t => t.plain_text).join('');
    }
    return 'Untitled';
  }
  
  titleMatches(title1, title2) {
    if (!title1 || !title2) return false;
    
    // Normalize both titles
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    // Check for exact match after normalization
    if (norm1 === norm2) return true;
    
    // Check if one contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    return false;
  }
  
  getPagesForSection(sectionKey) {
    const pages = [];
    
    for (const [pageId, mapping] of Object.entries(this.pageIdMap)) {
      if (mapping.type === 'SECTION' && mapping.key === sectionKey) {
        pages.push(pageId);
      } else if (mapping.type === 'CHILD_PAGE' && mapping.parentSection === sectionKey) {
        pages.push(pageId);
      }
    }
    
    return pages;
  }
}

// Main test function
async function testStructuredApproach() {
  console.log(`${colors.magenta}Testing Structured Notion Approach${colors.reset}\n`);
  
  try {
    // Step 1: Initialize the page mapper
    const pageMapper = new PageMapper();
    await pageMapper.initialize();
    
    // Step 2: Test finding pages for a section
    console.log(`\n${colors.cyan}Step 2: Testing section-based page retrieval...${colors.reset}`);
    const sectionKey = 'accounting_finance';
    const sectionPages = pageMapper.getPagesForSection(sectionKey);
    console.log(`${colors.green}Found ${sectionPages.length} pages in the ${sectionKey} section${colors.reset}`);
    
    if (sectionPages.length > 0) {
      // Step 3: Test retrieving content for a page
      console.log(`\n${colors.cyan}Step 3: Testing page content retrieval...${colors.reset}`);
      const testPageId = sectionPages[0];
      const pageMapping = pageMapper.pageIdMap[testPageId];
      console.log(`${colors.blue}Retrieving content for: ${pageMapping.title} (${testPageId})${colors.reset}`);
      
      // Get page content
      const pageBlocks = await getPageBlocks(testPageId);
      console.log(`${colors.green}Retrieved ${pageBlocks.length} blocks from the page${colors.reset}`);
      
      // Extract text content
      const content = extractTextFromBlocks(pageBlocks);
      console.log(`${colors.blue}Content length: ${content.length} characters${colors.reset}`);
      console.log(`${colors.blue}Content preview: ${content.substring(0, 200)}...${colors.reset}`);
      
      // Step 4: Test two-stage retrieval
      console.log(`\n${colors.cyan}Step 4: Testing two-stage retrieval...${colors.reset}`);
      const testQuery = 'What is our process for accounting?';
      console.log(`${colors.blue}Query: "${testQuery}"${colors.reset}`);
      
      // Find relevant sections
      const relevantSections = findRelevantSections(testQuery);
      console.log(`${colors.blue}Relevant sections:${colors.reset}`);
      console.log(`  High relevance: ${relevantSections.highRelevance.join(', ')}`);
      console.log(`  Medium relevance: ${relevantSections.mediumRelevance.join(', ')}`);
      
      // Get pages from relevant sections
      const relevantPages = [];
      for (const sectionKey of [...relevantSections.highRelevance, ...relevantSections.mediumRelevance]) {
        relevantPages.push(...pageMapper.getPagesForSection(sectionKey));
      }
      
      console.log(`${colors.green}Found ${relevantPages.length} potentially relevant pages${colors.reset}`);
      
      // Generate previews for the first 3 pages
      const previewPages = relevantPages.slice(0, 3);
      const potentialSources = [];
      
      for (const pageId of previewPages) {
        const mapping = pageMapper.pageIdMap[pageId];
        const blocks = await getPageBlocks(pageId, 1); // Shallow traversal
        const preview = extractTextFromBlocks(blocks).substring(0, 200) + '...';
        
        potentialSources.push({
          id: pageId,
          title: mapping.title,
          preview,
          path: mapping.type === 'CHILD_PAGE' && mapping.parentSection ? 
                `${WORKSPACE_STRUCTURE.sections[mapping.parentSection].title} > ${mapping.title}` : 
                mapping.title
        });
      }
      
      console.log(`${colors.blue}Potential sources:${colors.reset}`);
      potentialSources.forEach((source, index) => {
        console.log(`${colors.yellow}${index + 1}. ${source.title} (${source.path})${colors.reset}`);
        console.log(`   Preview: ${source.preview}`);
      });
      
      // Step 5: Test detailed retrieval for the first source
      if (potentialSources.length > 0) {
        console.log(`\n${colors.cyan}Step 5: Testing detailed retrieval...${colors.reset}`);
        const sourceId = potentialSources[0].id;
        console.log(`${colors.blue}Getting detailed content for: ${potentialSources[0].title}${colors.reset}`);
        
        const blocks = await getPageBlocks(sourceId, 3); // Deeper traversal
        const detailedContent = extractTextFromBlocks(blocks);
        
        console.log(`${colors.green}Retrieved detailed content (${detailedContent.length} characters)${colors.reset}`);
        console.log(`${colors.blue}Content preview: ${detailedContent.substring(0, 300)}...${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.green}All tests completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error testing structured approach: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

// Helper function to get page blocks
async function getPageBlocks(pageId, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    return [];
  }
  
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId
    });
    
    const blocks = response.results || [];
    
    // Process children recursively
    for (const block of blocks) {
      if (block.has_children) {
        block.children = await getPageBlocks(block.id, maxDepth, currentDepth + 1);
      }
    }
    
    return blocks;
  } catch (error) {
    console.error(`${colors.red}Error getting blocks for ${pageId}: ${error.message}${colors.reset}`);
    return [];
  }
}

// Helper function to extract text from blocks
function extractTextFromBlocks(blocks, indentLevel = 0) {
  if (!blocks || blocks.length === 0) {
    return '';
  }
  
  let content = '';
  const indent = '  '.repeat(indentLevel);
  
  for (const block of blocks) {
    // Extract text from this block
    let blockContent = '';
    
    if (block.type === 'paragraph') {
      blockContent = extractTextFromRichText(block.paragraph.rich_text);
    } else if (block.type === 'heading_1') {
      blockContent = extractTextFromRichText(block.heading_1.rich_text);
    } else if (block.type === 'heading_2') {
      blockContent = extractTextFromRichText(block.heading_2.rich_text);
    } else if (block.type === 'heading_3') {
      blockContent = extractTextFromRichText(block.heading_3.rich_text);
    } else if (block.type === 'bulleted_list_item') {
      blockContent = '• ' + extractTextFromRichText(block.bulleted_list_item.rich_text);
    } else if (block.type === 'numbered_list_item') {
      blockContent = '1. ' + extractTextFromRichText(block.numbered_list_item.rich_text);
    } else if (block.type === 'to_do') {
      blockContent = `[${block.to_do.checked ? 'x' : ' '}] ` + extractTextFromRichText(block.to_do.rich_text);
    } else if (block.type === 'toggle') {
      blockContent = extractTextFromRichText(block.toggle.rich_text);
    } else if (block.type === 'child_page') {
      blockContent = `[Page: ${block.child_page.title}]`;
    } else if (block.type === 'child_database') {
      blockContent = `[Database: ${block.child_database.title}]`;
    }
    
    if (blockContent) {
      content += `${indent}${blockContent}\n`;
    }
    
    // Add children's content with increased indentation
    if (block.children && block.children.length > 0) {
      content += extractTextFromBlocks(block.children, indentLevel + 1);
    }
  }
  
  return content;
}

// Helper function to extract text from rich text
function extractTextFromRichText(richText) {
  if (!richText || richText.length === 0) {
    return '';
  }
  
  return richText.map(t => t.plain_text).join('');
}

// Helper function to find relevant sections
function findRelevantSections(query) {
  const queryLower = query.toLowerCase();
  const highRelevance = [];
  const mediumRelevance = [];
  const lowRelevance = [];
  
  // Check each section for relevance
  for (const [sectionKey, section] of Object.entries(WORKSPACE_STRUCTURE.sections)) {
    let relevanceScore = 0;
    
    // Check if query contains section title
    if (queryLower.includes(section.title.toLowerCase())) {
      relevanceScore += 3;
    }
    
    // Check if query contains key terms
    for (const term of section.keyTerms) {
      if (queryLower.includes(term)) {
        relevanceScore += 1;
      }
    }
    
    // Categorize by relevance score
    if (relevanceScore >= 3) {
      highRelevance.push(sectionKey);
    } else if (relevanceScore >= 1) {
      mediumRelevance.push(sectionKey);
    } else {
      lowRelevance.push(sectionKey);
    }
  }
  
  return {
    highRelevance,
    mediumRelevance,
    lowRelevance
  };
}

// Run the test
testStructuredApproach()
  .then(() => {
    console.log(`${colors.green}Test script completed${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
