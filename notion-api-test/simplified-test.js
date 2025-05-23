/**
 * Simplified Test for Notion Integration
 * 
 * This script provides a simplified test of the Notion integration
 * that you can use as a reference for integrating into your main application.
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

// Main test function
async function runSimplifiedTest() {
  console.log('Running simplified test for Notion integration...');
  
  try {
    // Step 1: Initialize the adaptive structure
    console.log('\nStep 1: Initializing adaptive structure...');
    const adaptiveStructure = await initializeAdaptiveStructure();
    console.log('Adaptive structure initialized');
    
    // Step 2: Process a sample query
    console.log('\nStep 2: Processing a sample query...');
    const query = "What is the process for expense reimbursement?";
    console.log(`Query: "${query}"`);
    
    // Step 3: Find potential sources
    console.log('\nStep 3: Finding potential sources...');
    const potentialSources = await findPotentialSources(query, adaptiveStructure);
    console.log(`Found ${potentialSources.length} potential sources`);
    
    if (potentialSources.length === 0) {
      console.log('No potential sources found. Test cannot continue.');
      return;
    }
    
    // Display potential sources
    potentialSources.forEach((source, index) => {
      console.log(`\nSource ${index + 1}: ${source.title} (${source.path})`);
      console.log(`Preview: ${source.preview.substring(0, 100)}...`);
    });
    
    // Step 4: Format initial response with Gemini
    console.log('\nStep 4: Formatting initial response...');
    const initialResponse = await formatResponseWithGemini(potentialSources, query);
    console.log(`Initial response:\n${initialResponse}`);
    
    // Step 5: Get detailed content for the first source
    console.log('\nStep 5: Getting detailed content for the first source...');
    const sourceId = potentialSources[0].id;
    const detailedContent = await getDetailedContent(sourceId, query, adaptiveStructure);
    console.log(`Retrieved detailed content for: ${detailedContent.title}`);
    console.log(`Content length: ${detailedContent.content.length} characters`);
    
    // Step 6: Format detailed response with Gemini
    console.log('\nStep 6: Formatting detailed response...');
    const detailedResponse = await formatDetailedResponseWithGemini(detailedContent, query);
    console.log(`Detailed response:\n${detailedResponse}`);
    
    console.log('\nAll steps completed successfully!');
  } catch (error) {
    console.error('Error running simplified test:', error);
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
  console.log(`Retrieved ${pages.length} pages from Notion`);
  
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
  
  console.log(`Built parent-child relationships for ${Object.keys(adaptiveStructure.pageChildren).length} parent pages`);
  
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
      console.error('Error fetching pages:', error);
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
      page_size: 5
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
    console.error('Error finding potential sources:', error);
    return [];
  }
}

// Generate a preview for a page
async function generatePreview(pageId) {
  try {
    const blocks = await getPageBlocks(pageId, 1); // Shallow traversal
    const content = extractTextFromBlocks(blocks);
    
    // Limit content length
    if (content.length > 300) {
      return content.substring(0, 300) + '...';
    }
    
    return content;
  } catch (error) {
    console.error(`Error generating preview for ${pageId}:`, error);
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
    console.error(`Error getting path for ${pageId}:`, error);
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
    console.error(`Error getting detailed content for ${pageId}:`, error);
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
    console.error(`Error finding related pages for ${pageId}:`, error);
    return [];
  }
}

// Format response with Gemini
async function formatResponseWithGemini(potentialSources, query) {
  try {
    // Prepare sources for the LLM
    const formattedSources = potentialSources.map((source, index) => {
      return `${index + 1}. ${source.title} (${source.path})\n   Preview: ${source.preview.substring(0, 100)}...`;
    }).join('\n\n');
    
    const content = `I found some information that might help answer your question. Here are some potential sources:\n\n${formattedSources}\n\nLet me know which one you'd like to explore in more detail.`;
    
    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

You need to respond to a query based on the content provided. Format your response in a professional, clear manner.

Query: "${query}"

Content: "${content}"

Guidelines:
- Begin with a direct answer to the query
- Present information in a clean, organized manner
- Maintain a professional tone throughout
- Use "we", "our", and "us" when referring to SBC Australia
- Be concise while ensuring the information is complete and accurate
- Focus on delivering the most relevant information in a straightforward manner

Provide a professional, clear response to the query:`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error formatting response:', error);
    return "I found some information that might help answer your question, but I couldn't format it properly. Please let me know which source you'd like to explore in more detail.";
  }
}

// Format detailed response with Gemini
async function formatDetailedResponseWithGemini(detailedContent, query) {
  try {
    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

You need to respond to a query based on the content provided. Format your response in a professional, clear manner.

Query: "${query}"

Content: "${detailedContent.content}"

Guidelines:
- Begin with a direct answer to the query
- Present information in a clean, organized manner
- Maintain a professional tone throughout
- Use "we", "our", and "us" when referring to SBC Australia
- Be concise while ensuring the information is complete and accurate
- Focus on delivering the most relevant information in a straightforward manner

Provide a professional, clear response to the query:`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error formatting detailed response:', error);
    return "I found detailed information, but I couldn't format it properly. The content may still be helpful for your query.";
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
    console.error(`Error getting blocks for ${pageId}:`, error);
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

// Helper function to get page title
function getPageTitle(page) {
  if (page.properties && page.properties.title && page.properties.title.title) {
    return page.properties.title.title.map(t => t.plain_text).join('');
  } else if (page.properties && page.properties.Name && page.properties.Name.title) {
    return page.properties.Name.title.map(t => t.plain_text).join('');
  }
  return 'Untitled';
}

// Helper function to track page access
function trackPageAccess(pageId, adaptiveStructure) {
  const count = adaptiveStructure.frequentlyAccessedPages.get(pageId) || 0;
  adaptiveStructure.frequentlyAccessedPages.set(pageId, count + 1);
}

// Run the test
runSimplifiedTest()
  .then(() => {
    console.log('\nSimplified test completed');
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
