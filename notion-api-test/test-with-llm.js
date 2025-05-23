/**
 * Test Script for Notion Integration with LLM
 *
 * This script tests the Notion integration by simulating a user interaction
 * using the Gemini Flash 2.5 model to generate queries and evaluate responses.
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

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

// Adaptive Structure class (simplified version)
class AdaptiveStructure {
  constructor() {
    this.initialized = false;
    this.pageHierarchy = {};
    this.topLevelPages = [];
    this.pageChildren = {};
    this.pageParents = {};
    this.frequentlyAccessedPages = new Map();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log(`${colors.blue}Initializing adaptive structure...${colors.reset}`);
      await this.buildInitialHierarchy();
      this.initialized = true;
      console.log(`${colors.green}Adaptive structure initialized${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error initializing adaptive structure: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  async buildInitialHierarchy() {
    const pages = await this.getAllPageMetadata();
    console.log(`${colors.green}Retrieved ${pages.length} pages from Notion${colors.reset}`);

    for (const page of pages) {
      const pageId = page.id;

      if (page.parent) {
        const parentType = page.parent.type;

        if (parentType === 'page_id') {
          const parentId = page.parent.page_id;

          if (!this.pageChildren[parentId]) {
            this.pageChildren[parentId] = [];
          }
          this.pageChildren[parentId].push(pageId);
          this.pageParents[pageId] = parentId;
        } else if (parentType === 'workspace') {
          this.topLevelPages.push(pageId);
        }
      }
    }

    console.log(`${colors.blue}Found ${this.topLevelPages.length} top-level pages${colors.reset}`);
    console.log(`${colors.blue}Built parent-child relationships for ${Object.keys(this.pageChildren).length} parent pages${colors.reset}`);
  }

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

  async getPageChildren(pageId) {
    if (this.pageChildren[pageId]) return this.pageChildren[pageId];

    try {
      const response = await notion.blocks.children.list({ block_id: pageId });
      const blocks = response.results || [];

      const childPages = [];
      for (const block of blocks) {
        if (block.type === 'child_page') {
          childPages.push(block.id);
        }
      }

      this.pageChildren[pageId] = childPages;

      for (const childId of childPages) {
        this.pageParents[childId] = pageId;
      }

      return childPages;
    } catch (error) {
      console.error(`${colors.red}Error getting children for page ${pageId}: ${error.message}${colors.reset}`);
      return [];
    }
  }

  async findRelatedPages(pageId) {
    const related = new Set();
    const parentId = this.pageParents[pageId];
    if (!parentId) return Array.from(related);

    const siblings = this.pageChildren[parentId] || [];
    for (const siblingId of siblings) {
      if (siblingId !== pageId) related.add(siblingId);
    }

    return Array.from(related).slice(0, 5); // Limit to 5 related pages
  }

  trackPageAccess(pageId) {
    const count = this.frequentlyAccessedPages.get(pageId) || 0;
    this.frequentlyAccessedPages.set(pageId, count + 1);
  }
}

// Two-Stage Retrieval class (simplified version)
class TwoStageRetrieval {
  constructor(adaptiveStructure) {
    this.adaptiveStructure = adaptiveStructure;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    await this.adaptiveStructure.initialize();
    this.initialized = true;
    console.log(`${colors.green}Two-stage retrieval initialized${colors.reset}`);
  }

  async findPotentialSources(query) {
    if (!this.initialized) {
      throw new Error('Two-stage retrieval not initialized');
    }

    try {
      const apiResults = await notion.search({
        query,
        page_size: 5
      });

      const searchResults = apiResults.results.map(page => ({
        id: page.id,
        title: getPageTitle(page) || 'Untitled',
        url: `https://notion.so/${page.id.replace(/-/g, '')}`
      }));

      const potentialSources = await Promise.all(
        searchResults.map(async result => {
          this.adaptiveStructure.trackPageAccess(result.id);

          return {
            id: result.id,
            title: result.title,
            preview: await this.generatePreview(result.id, query),
            path: await this.getPathInHierarchy(result.id),
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

  async generatePreview(pageId, query) {
    try {
      const blocks = await getPageBlocks(pageId, 1); // Shallow traversal
      const content = extractTextFromBlocks(blocks);

      // Limit content length
      if (content.length > 300) {
        return content.substring(0, 300) + '...';
      }

      return content;
    } catch (error) {
      console.error(`${colors.red}Error generating preview for ${pageId}: ${error.message}${colors.reset}`);
      return 'Preview not available';
    }
  }

  async getPathInHierarchy(pageId) {
    try {
      const pathIds = await this.adaptiveStructure.getPathToPage(pageId);

      if (pathIds && pathIds.length > 0) {
        const pathTitles = [];

        for (const id of pathIds) {
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

  async getDetailedContent(pageId, query) {
    if (!this.initialized) {
      throw new Error('Two-stage retrieval not initialized');
    }

    try {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const pageTitle = getPageTitle(page) || 'Untitled';

      const blocks = await getPageBlocks(pageId, 3); // Deeper traversal
      const content = extractTextFromBlocks(blocks);

      const relatedPages = await this.findRelatedPages(pageId);
      const path = await this.getPathInHierarchy(pageId);

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

  async findRelatedPages(pageId) {
    try {
      const relatedIds = await this.adaptiveStructure.findRelatedPages(pageId);

      const relatedPages = await Promise.all(
        relatedIds.map(async id => {
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

// Helper function to get page title
function getPageTitle(page) {
  if (page.properties && page.properties.title && page.properties.title.title) {
    return page.properties.title.title.map(t => t.plain_text).join('');
  } else if (page.properties && page.properties.Name && page.properties.Name.title) {
    return page.properties.Name.title.map(t => t.plain_text).join('');
  }
  return 'Untitled';
}

// Function to generate a query using Gemini Flash 2.5
async function generateQuery() {
  try {
    // Use Gemini Flash 2.5 model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a user of a knowledge base system that contains business documentation.
Generate a realistic, specific question that someone might ask about business processes, accounting, or company policies.
The question should be concise (1-2 sentences) and focused on a specific topic.
Only generate the question, nothing else.`;

    const result = await model.generateContent(prompt);
    const query = result.response.text().trim();

    return query;
  } catch (error) {
    console.error(`${colors.red}Error generating query: ${error.message}${colors.reset}`);
    return "What is the process for expense reimbursement?";
  }
}

// Function to evaluate a response using Gemini Flash 2.5
async function evaluateResponse(query, response) {
  try {
    // Use Gemini Flash 2.5 model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are evaluating the quality of a response from a knowledge base system.

Query: "${query}"

Response: "${response}"

Evaluate the response on the following criteria:
1. Relevance: How relevant is the response to the query?
2. Completeness: Does the response provide a complete answer?
3. Structure: Is the response well-structured and easy to understand?
4. Overall quality: What is the overall quality of the response?

Provide a score from 1-10 for each criterion, and a brief explanation.
Then provide an overall score from 1-10.

Format your response as:
Relevance: [score] - [explanation]
Completeness: [score] - [explanation]
Structure: [score] - [explanation]
Overall quality: [score] - [explanation]

Overall score: [score]`;

    const result = await model.generateContent(prompt);
    const evaluation = result.response.text().trim();

    return evaluation;
  } catch (error) {
    console.error(`${colors.red}Error evaluating response: ${error.message}${colors.reset}`);
    return "Evaluation failed due to an error.";
  }
}

// Function to format a response using Gemini Flash 2.5
async function formatResponse(content, query) {
  try {
    // Use Gemini Flash 2.5 model
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
    const formattedResponse = result.response.text().trim();

    return formattedResponse;
  } catch (error) {
    console.error(`${colors.red}Error formatting response: ${error.message}${colors.reset}`);
    return "I couldn't format a response due to an error.";
  }
}

// Main test function
async function testWithLLM() {
  console.log(`${colors.magenta}Testing Notion Integration with LLM${colors.reset}\n`);

  try {
    // Step 1: Initialize the adaptive structure and two-stage retrieval
    const adaptiveStructure = new AdaptiveStructure();
    const twoStageRetrieval = new TwoStageRetrieval(adaptiveStructure);
    await twoStageRetrieval.initialize();

    // Step 2: Generate a query using Gemini Flash 2.5
    console.log(`\n${colors.cyan}Step 2: Generating a query using Gemini Flash 2.5...${colors.reset}`);
    const query = await generateQuery();
    console.log(`${colors.green}Generated query: "${query}"${colors.reset}`);

    // Step 3: Find potential sources
    console.log(`\n${colors.cyan}Step 3: Finding potential sources...${colors.reset}`);
    const potentialSources = await twoStageRetrieval.findPotentialSources(query);
    console.log(`${colors.green}Found ${potentialSources.length} potential sources${colors.reset}`);

    if (potentialSources.length === 0) {
      console.log(`${colors.yellow}No potential sources found. Test cannot continue.${colors.reset}`);
      return;
    }

    // Display potential sources
    potentialSources.forEach((source, index) => {
      console.log(`\n${colors.yellow}Source ${index + 1}: ${source.title} (${source.path})${colors.reset}`);
      console.log(`${colors.blue}Preview: ${source.preview.substring(0, 100)}...${colors.reset}`);
    });

    // Step 4: Format initial response
    console.log(`\n${colors.cyan}Step 4: Formatting initial response...${colors.reset}`);

    // Prepare sources for the LLM
    const formattedSources = potentialSources.map((source, index) => {
      return `${index + 1}. ${source.title} (${source.path})\n   Preview: ${source.preview.substring(0, 100)}...`;
    }).join('\n\n');

    const initialResponseContent = `I found some information that might help answer your question. Here are some potential sources:\n\n${formattedSources}\n\nLet me know which one you'd like to explore in more detail.`;

    const initialResponse = await formatResponse(initialResponseContent, query);
    console.log(`${colors.green}Initial response:${colors.reset}\n${initialResponse}`);

    // Step 5: Get detailed content for the first source
    console.log(`\n${colors.cyan}Step 5: Getting detailed content for the first source...${colors.reset}`);
    const sourceId = potentialSources[0].id;
    const detailedContent = await twoStageRetrieval.getDetailedContent(sourceId, query);
    console.log(`${colors.green}Retrieved detailed content for: ${detailedContent.title}${colors.reset}`);
    console.log(`${colors.blue}Content length: ${detailedContent.content.length} characters${colors.reset}`);

    // Step 6: Format detailed response
    console.log(`\n${colors.cyan}Step 6: Formatting detailed response...${colors.reset}`);
    const detailedResponse = await formatResponse(detailedContent.content, query);
    console.log(`${colors.green}Detailed response:${colors.reset}\n${detailedResponse}`);

    // Step 7: Evaluate the response
    console.log(`\n${colors.cyan}Step 7: Evaluating the response...${colors.reset}`);
    const evaluation = await evaluateResponse(query, detailedResponse);
    console.log(`${colors.green}Evaluation:${colors.reset}\n${evaluation}`);

    console.log(`\n${colors.green}All tests completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error testing with LLM: ${error.message}${colors.reset}`);
    console.error(error.stack);
  }
}

// Run the test
testWithLLM()
  .then(() => {
    console.log(`${colors.green}Test script completed${colors.reset}`);
  })
  .catch(error => {
    console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
