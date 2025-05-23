/**
 * Discover Workspace Structure
 * 
 * This script analyzes your Notion workspace to discover its actual structure,
 * including common titles, patterns, and hierarchical relationships.
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

// Main function
async function discoverWorkspaceStructure() {
  console.log(`${colors.magenta}Discovering Notion Workspace Structure${colors.reset}\n`);
  
  try {
    // Step 1: Get all pages
    console.log(`${colors.cyan}Step 1: Retrieving all pages...${colors.reset}`);
    const pages = await getAllPages();
    console.log(`${colors.green}Retrieved ${pages.length} pages from Notion${colors.reset}`);
    
    // Step 2: Analyze page titles
    console.log(`\n${colors.cyan}Step 2: Analyzing page titles...${colors.reset}`);
    const titleAnalysis = analyzePageTitles(pages);
    
    console.log(`${colors.blue}Common title patterns:${colors.reset}`);
    titleAnalysis.commonPatterns.slice(0, 20).forEach((pattern, index) => {
      console.log(`  ${index + 1}. "${pattern.pattern}" (${pattern.count} pages)`);
    });
    
    console.log(`\n${colors.blue}Common title words:${colors.reset}`);
    Object.entries(titleAnalysis.commonWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([word, count], index) => {
        console.log(`  ${index + 1}. "${word}" (${count} pages)`);
      });
    
    // Step 3: Analyze parent-child relationships
    console.log(`\n${colors.cyan}Step 3: Analyzing parent-child relationships...${colors.reset}`);
    const relationshipAnalysis = analyzeRelationships(pages);
    
    console.log(`${colors.blue}Parent types:${colors.reset}`);
    Object.entries(relationshipAnalysis.parentTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} pages`);
      });
    
    if (relationshipAnalysis.parentPages.length > 0) {
      console.log(`\n${colors.blue}Top parent pages (with most children):${colors.reset}`);
      relationshipAnalysis.parentPages.slice(0, 10).forEach((parent, index) => {
        console.log(`  ${index + 1}. "${parent.title}" (${parent.childCount} children)`);
      });
    }
    
    // Step 4: Identify potential sections
    console.log(`\n${colors.cyan}Step 4: Identifying potential sections...${colors.reset}`);
    const potentialSections = identifyPotentialSections(pages, relationshipAnalysis);
    
    console.log(`${colors.green}Identified ${potentialSections.length} potential sections${colors.reset}`);
    potentialSections.forEach((section, index) => {
      console.log(`\n${colors.yellow}Section ${index + 1}: ${section.title} (${section.childPages.length} child pages)${colors.reset}`);
      console.log(`  ID: ${section.id}`);
      console.log(`  Child pages (up to 5):`);
      section.childPages.slice(0, 5).forEach((child, childIndex) => {
        console.log(`    ${childIndex + 1}. ${child.title}`);
      });
    });
    
    // Step 5: Generate suggested structure
    console.log(`\n${colors.cyan}Step 5: Generating suggested structure...${colors.reset}`);
    const suggestedStructure = generateSuggestedStructure(potentialSections, titleAnalysis);
    
    // Save the suggested structure to a file
    const outputPath = path.join(__dirname, 'suggested-structure.js');
    fs.writeFileSync(outputPath, suggestedStructure);
    console.log(`${colors.green}Saved suggested structure to ${outputPath}${colors.reset}`);
    
    console.log(`\n${colors.green}Workspace structure discovery completed!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error discovering workspace structure: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

// Helper function to get all pages
async function getAllPages() {
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

// Helper function to get page title
function getPageTitle(page) {
  if (page.properties && page.properties.title && page.properties.title.title) {
    return page.properties.title.title.map(t => t.plain_text).join('');
  } else if (page.properties && page.properties.Name && page.properties.Name.title) {
    return page.properties.Name.title.map(t => t.plain_text).join('');
  }
  return 'Untitled';
}

// Helper function to analyze page titles
function analyzePageTitles(pages) {
  const titles = pages.map(page => getPageTitle(page));
  const words = {};
  const patterns = {};
  
  // Analyze words
  titles.forEach(title => {
    const titleWords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    titleWords.forEach(word => {
      words[word] = (words[word] || 0) + 1;
    });
    
    // Look for patterns (e.g., "X - Y", "X: Y")
    if (title.includes(' - ')) {
      const pattern = 'X - Y';
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
    
    if (title.includes(': ')) {
      const pattern = 'X: Y';
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
    
    if (title.match(/^\d+\.\s/)) {
      const pattern = 'N. X';
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
    
    if (title.includes('(') && title.includes(')')) {
      const pattern = 'X (Y)';
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    }
  });
  
  // Sort patterns by frequency
  const commonPatterns = Object.entries(patterns)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);
  
  return {
    commonWords: words,
    commonPatterns
  };
}

// Helper function to analyze relationships
function analyzeRelationships(pages) {
  const parentTypes = {};
  const parentPageMap = {};
  
  // Count parent types and build parent-child map
  pages.forEach(page => {
    if (page.parent) {
      const parentType = page.parent.type;
      parentTypes[parentType] = (parentTypes[parentType] || 0) + 1;
      
      if (parentType === 'page_id') {
        const parentId = page.parent.page_id;
        if (!parentPageMap[parentId]) {
          parentPageMap[parentId] = [];
        }
        parentPageMap[parentId].push({
          id: page.id,
          title: getPageTitle(page)
        });
      }
    }
  });
  
  // Find parent pages
  const parentPages = [];
  pages.forEach(page => {
    const pageId = page.id;
    if (parentPageMap[pageId]) {
      parentPages.push({
        id: pageId,
        title: getPageTitle(page),
        childCount: parentPageMap[pageId].length,
        children: parentPageMap[pageId]
      });
    }
  });
  
  // Sort parent pages by child count
  parentPages.sort((a, b) => b.childCount - a.childCount);
  
  return {
    parentTypes,
    parentPages,
    parentPageMap
  };
}

// Helper function to identify potential sections
function identifyPotentialSections(pages, relationshipAnalysis) {
  // Consider pages with multiple children as potential sections
  const potentialSections = relationshipAnalysis.parentPages
    .filter(parent => parent.childCount >= 3) // At least 3 children
    .map(parent => {
      const page = pages.find(p => p.id === parent.id);
      return {
        id: parent.id,
        title: parent.title,
        childPages: parent.children,
        parent: page ? page.parent : null
      };
    });
  
  return potentialSections;
}

// Helper function to generate suggested structure
function generateSuggestedStructure(potentialSections, titleAnalysis) {
  // Extract common words for document types
  const commonWords = Object.entries(titleAnalysis.commonWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word]) => word);
  
  // Generate document types based on common words
  const documentTypes = {};
  const typeKeywords = {
    'POLICY': ['policy', 'policies', 'guideline', 'guidelines', 'rule', 'rules'],
    'PROCEDURE': ['procedure', 'process', 'workflow', 'how', 'guide', 'step'],
    'CONTACT': ['contact', 'people', 'person', 'team', 'staff', 'member'],
    'FORM': ['form', 'template', 'document', 'checklist'],
    'REPORT': ['report', 'analysis', 'review', 'summary']
  };
  
  // Find matching keywords
  for (const [type, keywords] of Object.entries(typeKeywords)) {
    const matchingKeywords = keywords.filter(keyword => 
      commonWords.includes(keyword)
    );
    
    if (matchingKeywords.length > 0) {
      documentTypes[type] = {
        keyTerms: matchingKeywords,
        importance: type === 'POLICY' || type === 'PROCEDURE' ? 'high' : 'medium'
      };
    }
  }
  
  // Add GENERAL_INFO type
  documentTypes['GENERAL_INFO'] = {
    keyTerms: ['information', 'about', 'overview', 'description', 'details'],
    importance: 'medium'
  };
  
  // Generate sections
  const sections = {};
  potentialSections.slice(0, 10).forEach(section => {
    const sectionKey = section.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Extract key terms from child page titles
    const childTitles = section.childPages.map(child => child.title.toLowerCase());
    const childWords = new Set();
    childTitles.forEach(title => {
      title.split(/\s+/).filter(word => word.length > 3).forEach(word => {
        childWords.add(word);
      });
    });
    
    sections[sectionKey] = {
      title: section.title,
      documentType: 'SECTION',
      keyTerms: [...childWords].slice(0, 10),
      children: section.childPages.map(child => 
        child.title.toLowerCase().replace(/[^a-z0-9]/g, '_')
      )
    };
  });
  
  // Generate the structure code
  const structureCode = `/**
 * Suggested Workspace Structure
 * 
 * This structure was automatically generated based on analysis of your Notion workspace.
 * You may need to modify it to better match your specific needs.
 */

const WORKSPACE_STRUCTURE = {
  // Main sections of the workspace
  sections: ${JSON.stringify(sections, null, 2)},
  
  // Document types and their characteristics
  documentTypes: ${JSON.stringify(documentTypes, null, 2)}
};

module.exports = WORKSPACE_STRUCTURE;`;
  
  return structureCode;
}

// Run the discovery
discoverWorkspaceStructure()
  .then(() => {
    console.log(`${colors.green}Discovery script completed${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
