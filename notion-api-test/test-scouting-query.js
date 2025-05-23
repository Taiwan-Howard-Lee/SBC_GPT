/**
 * Test Script for Notion Integration with Scouting Query
 * 
 * This script tests the Notion integration with a specific query about scouting procedures.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Notion client with API key from .env
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

// Initialize Gemini API with API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
async function testScoutingQuery() {
  console.log(`${colors.magenta}Testing Notion Integration with Scouting Query${colors.reset}\n`);
  
  try {
    // Step 1: Initialize the adaptive structure
    console.log(`${colors.cyan}Step 1: Initializing adaptive structure...${colors.reset}`);
    const adaptiveStructure = await initializeAdaptiveStructure();
    console.log(`${colors.green}Adaptive structure initialized${colors.reset}`);
    
    // Step 2: Process the scouting query
    console.log(`\n${colors.cyan}Step 2: Processing scouting query...${colors.reset}`);
    const query = "What is the scouting procedure?";
    console.log(`${colors.blue}Query: "${query}"${colors.reset}`);
    
    // Step 3: Find potential sources
    console.log(`\n${colors.cyan}Step 3: Finding potential sources...${colors.reset}`);
    const potentialSources = await findPotentialSources(query, adaptiveStructure);
    console.log(`${colors.green}Found ${potentialSources.length} potential sources${colors.reset}`);
    
    if (potentialSources.length === 0) {
      console.log(`${colors.yellow}No potential sources found. Test cannot continue.${colors.reset}`);
      return;
    }
    
    // Display potential sources
    potentialSources.forEach((source, index) => {
      console.log(`\n${colors.yellow}Source ${index + 1}: ${source.title} (${source.path})${colors.reset}`);
      console.log(`${colors.blue}Preview: ${source.preview.substring(0, 200)}...${colors.reset}`);
    });
    
    // Step 4: Format initial response with Gemini
    console.log(`\n${colors.cyan}Step 4: Formatting initial response...${colors.reset}`);
    const initialResponse = await formatResponseWithGemini(potentialSources, query);
    console.log(`${colors.green}Initial response:${colors.reset}\n${initialResponse}`);
    
    // Step 5: Get detailed content for the most relevant source
    console.log(`\n${colors.cyan}Step 5: Getting detailed content for the most relevant source...${colors.reset}`);
    
    // Find the most relevant source by looking for "scout" in the preview
    let mostRelevantSourceIndex = 0;
    for (let i = 0; i < potentialSources.length; i++) {
      if (potentialSources[i].preview.toLowerCase().includes('scout')) {
        mostRelevantSourceIndex = i;
        break;
      }
    }
    
    const sourceId = potentialSources[mostRelevantSourceIndex].id;
    console.log(`${colors.blue}Selected source ${mostRelevantSourceIndex + 1}: ${potentialSources[mostRelevantSourceIndex].title}${colors.reset}`);
    
    const detailedContent = await getDetailedContent(sourceId, query, adaptiveStructure);
    console.log(`${colors.green}Retrieved detailed content for: ${detailedContent.title}${colors.reset}`);
    console.log(`${colors.blue}Content length: ${detailedContent.content.length} characters${colors.reset}`);
    console.log(`${colors.blue}Content preview: ${detailedContent.content.substring(0, 300)}...${colors.reset}`);
    
    // Step 6: Format detailed response with Gemini
    console.log(`\n${colors.cyan}Step 6: Formatting detailed response...${colors.reset}`);
    const detailedResponse = await formatDetailedResponseWithGemini(detailedContent, query);
    console.log(`${colors.green}Detailed response:${colors.reset}\n${detailedResponse}`);
    
    console.log(`\n${colors.green}All steps completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error testing scouting query: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

// Initialize adaptive structure
async function initializeAdaptiveStructure() {
  const adaptiveStructure = {
    pageParents: {},
    pageChildren: {},
    frequentlyAccessedPages: new Map()
  };
  
  // Get all pages
  const pages = await getAllPages();
  console.log(`${colors.green}Retrieved ${pages.length} pages from Notion${colors.reset}`);
  
  // Process parent-child relationships
  for (const page of pages) {
    const pageId = page.id;
    
    if (page.parent) {
      const parentType = page.parent.type;
      
      if (parentType === 'page_id') {
        const parentId = page.parent.page_id;
        
        if (!adaptiveStructure.pageChildren[parentId]) {
          adaptiveStructure.pageChildren[parentId] = [];
        }
        adaptiveStructure.pageChildren[parentId].push(pageId);
        adaptiveStructure.pageParents[pageId] = parentId;
      }
    }
  }
  
  console.log(`${colors.blue}Built parent-child relationships for ${Object.keys(adaptiveStructure.pageChildren).length} parent pages${colors.reset}`);
  
  return adaptiveStructure;
}

// Get all pages from Notion
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

// Find potential sources for a query
async function findPotentialSources(query, adaptiveStructure) {
  try {
    // Search Notion for the query
    const apiResults = await notion.search({
      query,
      page_size: 10 // Increased to 10 to find more potential matches
    });
    
    const searchResults = apiResults.results.map(page => ({
      id: page.id,
      title: getPageTitle(page) || 'Untitled',
      url: `https://notion.so/${page.id.replace(/-/g, '')}`
    }));
    
    // Generate previews and paths for each result
    const potentialSources = await Promise.all(
      searchResults.map(async result => {
        // Track this page access
        trackPageAccess(result.id, adaptiveStructure);
        
        return {
          id: result.id,
          title: result.title,
          preview: await generatePreview(result.id),
          path: await getPathInHierarchy(result.id, adaptiveStructure),
          url: result.url
        };
      })
    );
    
    return potentialSources;
  } catch (error) {
    console.error(`${colors.red}Error finding potential sources: ${error.message}${colors.reset}`);
    return [];
  }
}

// Generate a preview for a page
async function generatePreview(pageId) {
  try {
    const blocks = await getPageBlocks(pageId, 1); // Shallow traversal
    const content = extractTextFromBlocks(blocks);
    
    // Limit content length
    if (content.length > 500) {
      return content.substring(0, 500) + '...';
    }
    
    return content;
  } catch (error) {
    console.error(`${colors.red}Error generating preview for ${pageId}: ${error.message}${colors.reset}`);
    return 'Preview not available';
  }
}

// Get the path in the hierarchy for a page
async function getPathInHierarchy(pageId, adaptiveStructure) {
  try {
    const path = [];
    let currentId = pageId;
    
    // Prevent infinite loops
    const visited = new Set();
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      path.unshift(currentId);
      
      // Get parent
      currentId = adaptiveStructure.pageParents[currentId];
    }
    
    if (path.length > 0) {
      const pathTitles = [];
      
      for (const id of path) {
        try {
          const page = await notion.pages.retrieve({ page_id: id });
          const title = getPageTitle(page) || 'Untitled';
          pathTitles.push(title);
        } catch (error) {
          pathTitles.push('Untitled');
        }
      }
      
      return pathTitles.join(' > ');
    }
    
    return 'Untitled';
  } catch (error) {
    console.error(`${colors.red}Error getting path for ${pageId}: ${error.message}${colors.reset}`);
    return 'Unknown path';
  }
}

// Get detailed content for a page
async function getDetailedContent(pageId, query, adaptiveStructure) {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const pageTitle = getPageTitle(page) || 'Untitled';
    
    const blocks = await getPageBlocks(pageId, 3); // Deeper traversal
    const content = extractTextFromBlocks(blocks);
    
    const relatedPages = await findRelatedPages(pageId, adaptiveStructure);
    const path = await getPathInHierarchy(pageId, adaptiveStructure);
    
    return {
      id: pageId,
      title: pageTitle,
      content,
      path,
      relatedPages,
      url: `https://notion.so/${pageId.replace(/-/g, '')}`
    };
  } catch (error) {
    console.error(`${colors.red}Error getting detailed content for ${pageId}: ${error.message}${colors.reset}`);
    throw error;
  }
}

// Find related pages
async function findRelatedPages(pageId, adaptiveStructure) {
  try {
    const related = new Set();
    
    // Get parent
    const parentId = adaptiveStructure.pageParents[pageId];
    if (!parentId) {
      return Array.from(related);
    }
    
    // Get siblings (other children of the same parent)
    const siblings = adaptiveStructure.pageChildren[parentId] || [];
    for (const siblingId of siblings) {
      if (siblingId !== pageId) {
        related.add(siblingId);
      }
    }
    
    // Get basic info for each related page
    const relatedPages = await Promise.all(
      Array.from(related).slice(0, 3).map(async id => {
        try {
          const page = await notion.pages.retrieve({ page_id: id });
          const title = getPageTitle(page) || 'Untitled';
          
          return {
            id,
            title,
            url: `https://notion.so/${id.replace(/-/g, '')}`
          };
        } catch (error) {
          return null;
        }
      })
    );
    
    return relatedPages.filter(page => page !== null);
  } catch (error) {
    console.error(`${colors.red}Error finding related pages for ${pageId}: ${error.message}${colors.reset}`);
    return [];
  }
}

// Format response with Gemini
async function formatResponseWithGemini(potentialSources, query) {
  try {
    // Prepare sources for the LLM
    const formattedSources = potentialSources.map((source, index) => {
      return `${index + 1}. ${source.title} (${source.path})\n   Preview: ${source.preview.substring(0, 200)}...`;
    }).join('\n\n');
    
    const content = `I found some information that might help answer your question about scouting procedures. Here are some potential sources:\n\n${formattedSources}\n\nLet me know which one you'd like to explore in more detail.`;
    
    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

You need to respond to a query about scouting procedures based on the content provided. Format your response in a professional, clear manner.

Query: "${query}"

Content: "${content}"

Guidelines:
- Begin with a direct answer to the query about scouting procedures
- Present information in a clean, organized manner
- Maintain a professional tone throughout
- Use "we", "our", and "us" when referring to SBC Australia
- Be concise while ensuring the information is complete and accurate
- Focus on delivering the most relevant information in a straightforward manner
- If you see any information about startup scouting, highlight it prominently

Provide a professional, clear response to the query:`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error(`${colors.red}Error formatting response: ${error.message}${colors.reset}`);
    return "I found some information that might help answer your question about scouting procedures, but I couldn't format it properly. Please let me know which source you'd like to explore in more detail.";
  }
}

// Format detailed response with Gemini
async function formatDetailedResponseWithGemini(detailedContent, query) {
  try {
    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

You need to respond to a query about scouting procedures based on the content provided. Format your response in a professional, clear manner.

Query: "${query}"

Content: "${detailedContent.content}"

Guidelines:
- Begin with a direct answer to the query about scouting procedures
- Present information in a clean, organized manner
- Maintain a professional tone throughout
- Use "we", "our", and "us" when referring to SBC Australia
- Be concise while ensuring the information is complete and accurate
- Focus on delivering the most relevant information in a straightforward manner
- If you see any information about startup scouting, highlight it prominently
- If the content doesn't contain information about scouting procedures, clearly state that

Provide a professional, clear response to the query:`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error(`${colors.red}Error formatting detailed response: ${error.message}${colors.reset}`);
    return "I found detailed information, but I couldn't format it properly. The content may still be helpful for your query about scouting procedures.";
  }
}

// Helper functions
async function getPageBlocks(pageId, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  
  try {
    const response = await notion.blocks.children.list({ block_id: pageId });
    const blocks = response.results || [];
    
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

function extractTextFromBlocks(blocks, indentLevel = 0) {
  if (!blocks || blocks.length === 0) return '';
  
  let content = '';
  const indent = '  '.repeat(indentLevel);
  
  for (const block of blocks) {
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
    
    if (block.children && block.children.length > 0) {
      content += extractTextFromBlocks(block.children, indentLevel + 1);
    }
  }
  
  return content;
}

function extractTextFromRichText(richText) {
  if (!richText || richText.length === 0) return '';
  return richText.map(t => t.plain_text).join('');
}

function getPageTitle(page) {
  if (page.properties && page.properties.title && page.properties.title.title) {
    return page.properties.title.title.map(t => t.plain_text).join('');
  } else if (page.properties && page.properties.Name && page.properties.Name.title) {
    return page.properties.Name.title.map(t => t.plain_text).join('');
  }
  return 'Untitled';
}

function trackPageAccess(pageId, adaptiveStructure) {
  const count = adaptiveStructure.frequentlyAccessedPages.get(pageId) || 0;
  adaptiveStructure.frequentlyAccessedPages.set(pageId, count + 1);
}

// Run the test
testScoutingQuery()
  .then(() => {
    console.log(`\n${colors.green}Scouting query test completed${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error}${colors.reset}`);
    process.exit(1);
  });
