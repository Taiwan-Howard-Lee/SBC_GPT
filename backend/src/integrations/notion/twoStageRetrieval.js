/**
 * Two-Stage Retrieval
 *
 * Implements a two-stage retrieval process for Notion content:
 * 1. Initial search returns potential answer locations
 * 2. Detailed retrieval gets full content when requested
 */

const notionApi = require('./api');
const notionUtils = require('./utils');
const notionCache = require('./cache');
const adaptiveStructure = require('./adaptiveStructure');
// No need for workspace structure with adaptive approach
const { processMessage } = require('../../services/geminiService');

class TwoStageRetrieval {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the two-stage retrieval
   */
  async initialize() {
    if (this.initialized) {
      console.log('Two-stage retrieval already initialized');
      return true;
    }

    try {
      console.log('Initializing two-stage retrieval...');

      // Initialize the adaptive structure
      const adaptiveInitialized = await adaptiveStructure.initialize();

      if (!adaptiveInitialized) {
        console.warn('Warning: Adaptive structure initialization failed, but continuing with two-stage retrieval');
      }

      this.initialized = true;
      console.log('Two-stage retrieval initialized with adaptive structure');
      return true;
    } catch (error) {
      console.error('Error initializing two-stage retrieval:', error);
      // Mark as initialized anyway to prevent blocking operations
      this.initialized = true;
      console.log('Two-stage retrieval marked as initialized despite errors');
      return false;
    }
  }

  /**
   * Stage 1: Find potential sources for a query
   */
  async findPotentialSources(query) {
    console.log(`Finding potential sources for query: "${query}"`);

    if (!this.initialized) {
      console.error('Two-stage retrieval not initialized');
      throw new Error('Two-stage retrieval not initialized');
    }

    // First try to search using the cache if it's initialized
    let searchResults = [];
    if (notionCache.isInitialized) {
      searchResults = notionCache.search(query);
      console.log(`Found ${searchResults.length} results in cache`);
    }

    // If we don't have enough results, try direct API search
    if (searchResults.length < 5) {
      try {
        const apiResults = await notionApi.search({
          query,
          page_size: 5 - searchResults.length
        });

        const formattedResults = notionUtils.formatSearchResults(apiResults);
        searchResults = [...searchResults, ...formattedResults];
        console.log(`Found ${formattedResults.length} additional results from API`);
      } catch (error) {
        console.error('Error searching Notion API:', error);
      }
    }

    // If we still don't have results, use frequently accessed pages
    if (searchResults.length === 0) {
      console.log(`No search results found for query: "${query}"`);
      const frequentPages = adaptiveStructure.getFrequentlyAccessedPages(5);
      console.log(`Using ${frequentPages.length} frequently accessed pages as fallback`);

      for (const pageId of frequentPages) {
        try {
          const page = await notionApi.getPage(pageId);
          searchResults.push({
            id: pageId,
            title: notionUtils.getPageTitle(page) || 'Untitled',
            url: `https://notion.so/${pageId.replace(/-/g, '')}`
          });
        } catch (error) {
          console.error(`Error getting frequent page ${pageId}:`, error);
        }
      }
    }

    // Generate previews
    const potentialSources = await Promise.all(
      searchResults.map(async result => {
        // Track this page access
        adaptiveStructure.trackPageAccess(result.id);

        return {
          id: result.id,
          title: result.title || 'Untitled',
          preview: await this.generatePreview(result.id, query),
          path: await this.getPathInHierarchy(result.id),
          url: result.url || `https://notion.so/${result.id.replace(/-/g, '')}`,
          relevance: result.score || 1
        };
      })
    );

    return potentialSources;
  }

  /**
   * Generate a preview for a potential source
   */
  async generatePreview(pageId, query) {
    try {
      // Try to get from cache first
      let content = '';
      if (notionCache.isInitialized) {
        const cachedContent = notionCache.getContent(pageId);
        if (cachedContent) {
          content = cachedContent.content;
        }
      }

      // If not in cache, get a brief content sample
      if (!content) {
        // Get page blocks directly
        const blocks = await notionApi.getChildBlocks(pageId);
        content = this.extractTextFromBlocks(blocks);
      }

      // Limit content length
      if (content.length > 500) {
        content = content.substring(0, 500) + '...';
      }

      // Use LLM to generate a focused preview
      return await this.generateFocusedPreview(content, query);
    } catch (error) {
      console.error(`Error generating preview for ${pageId}:`, error);
      return 'Preview not available';
    }
  }

  /**
   * Use LLM to generate a focused preview
   */
  async generateFocusedPreview(content, query) {
    try {
      const prompt = [
        {
          role: 'system',
          content: `You are a helpful assistant that creates brief, focused previews of content.
          Given a query and some content, extract or summarize the most relevant information that might answer the query.
          Keep your response under 100 words and focus only on information directly relevant to the query.
          If the content doesn't seem relevant to the query, say "This content may not directly address the query."
          Do not include phrases like "Based on the content" or "The text mentions" - just provide the relevant information directly.`
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nContent: "${content}"\n\nProvide a brief, focused preview of the most relevant information:`
        }
      ];

      const response = await processMessage(prompt);
      return response.content;
    } catch (error) {
      console.error('Error generating focused preview:', error);

      // Fallback to a simple preview
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '');
    }
  }

  /**
   * Get the path in the hierarchy for a page
   */
  async getPathInHierarchy(pageId) {
    try {
      // Get the path using adaptive structure
      const pathIds = await adaptiveStructure.getPathToPage(pageId);

      // If we have a path, get the titles
      if (pathIds.length > 0) {
        const pathTitles = [];

        for (const id of pathIds) {
          try {
            // Try to get from cache first
            let title = 'Untitled';
            if (notionCache.isInitialized) {
              const cachedPage = notionCache.getPage(id);
              if (cachedPage) {
                title = cachedPage.title || 'Untitled';
              }
            }

            // If not in cache, get from API
            if (title === 'Untitled') {
              const page = await notionApi.getPage(id);
              title = notionUtils.getPageTitle(page) || 'Untitled';
            }

            pathTitles.push(title);
          } catch (error) {
            console.error(`Error getting title for page ${id}:`, error);
            pathTitles.push('Untitled');
          }
        }

        return pathTitles.join(' > ');
      }

      // If no path, try to get parent information directly
      const page = await notionApi.getPage(pageId);

      if (page.parent) {
        if (page.parent.type === 'page_id') {
          // Get parent page
          const parentPage = await notionApi.getPage(page.parent.page_id);
          const parentTitle = notionUtils.getPageTitle(parentPage) || 'Untitled';
          return `${parentTitle} > ${notionUtils.getPageTitle(page) || 'Untitled'}`;
        } else if (page.parent.type === 'workspace') {
          return notionUtils.getPageTitle(page) || 'Untitled';
        }
      }

      return notionUtils.getPageTitle(page) || 'Untitled';
    } catch (error) {
      console.error(`Error getting path for ${pageId}:`, error);
      return 'Unknown path';
    }
  }

  /**
   * Stage 2: Get detailed content for a specific source
   */
  async getDetailedContent(pageId, query) {
    if (!this.initialized) {
      throw new Error('Two-stage retrieval not initialized');
    }

    try {
      // Try to get from cache first
      let pageContent = null;
      if (notionCache.isInitialized) {
        const cachedContent = notionCache.getContent(pageId);
        if (cachedContent) {
          pageContent = cachedContent;
        }
      }

      // If not in cache, get from API
      if (!pageContent) {
        // Get page data
        const page = await notionApi.getPage(pageId);
        const pageTitle = notionUtils.getPageTitle(page);

        // Get page blocks directly with recursive retrieval
        const blocks = await this.getPageBlocksRecursively(pageId, 3); // Deeper traversal
        const content = this.extractTextFromBlocks(blocks);

        pageContent = {
          id: pageId,
          title: pageTitle || 'Untitled',
          content,
          url: `https://notion.so/${pageId.replace(/-/g, '')}`
        };
      }

      // Get related pages
      const relatedPages = await this.findRelatedPages(pageId, query);

      // Get the path in the hierarchy
      const path = await this.getPathInHierarchy(pageId);

      // Classify the document type
      const documentType = await this.classifyDocumentType(pageId, pageContent.content);

      // Process content based on document type
      const processedContent = await this.processContentByType(pageContent, documentType, query);

      return {
        id: pageId,
        title: pageContent.title,
        content: processedContent,
        path,
        documentType,
        relatedPages,
        url: pageContent.url
      };
    } catch (error) {
      console.error(`Error getting detailed content for ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Find related pages
   */
  async findRelatedPages(pageId, query) {
    try {
      // Use adaptive structure to find related pages
      const relatedIds = await adaptiveStructure.findRelatedPages(pageId);

      // Get basic info for each page (up to 3)
      const relatedPages = await Promise.all(
        relatedIds.slice(0, 3).map(async id => {
          try {
            // Try to get from cache first
            let title = 'Untitled';
            if (notionCache.isInitialized) {
              const cachedPage = notionCache.getPage(id);
              if (cachedPage) {
                title = cachedPage.title || 'Untitled';
              }
            }

            // If not in cache, get from API
            if (title === 'Untitled') {
              const page = await notionApi.getPage(id);
              title = notionUtils.getPageTitle(page) || 'Untitled';
            }

            // Track this page access
            adaptiveStructure.trackPageAccess(id);

            return {
              id,
              title,
              url: `https://notion.so/${id.replace(/-/g, '')}`
            };
          } catch (error) {
            console.error(`Error getting related page ${id}:`, error);
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

  /**
   * Classify document type
   */
  async classifyDocumentType(pageId, content) {
    // Simple classification based on content keywords
    const contentLower = content.toLowerCase();

    if (contentLower.includes('policy') || contentLower.includes('guideline') || contentLower.includes('rule')) {
      return 'POLICY';
    } else if (contentLower.includes('procedure') || contentLower.includes('process') || contentLower.includes('how to')) {
      return 'PROCEDURE';
    } else if (contentLower.includes('contact') || contentLower.includes('email') || contentLower.includes('phone')) {
      return 'CONTACT_LIST';
    } else if (contentLower.includes('form') || contentLower.includes('template') || contentLower.includes('fill')) {
      return 'FORM';
    } else {
      return 'GENERAL_INFO';
    }
  }

  /**
   * Process content based on document type
   */
  async processContentByType(pageContent, documentType, query) {
    // For MVP, we'll just return the raw content
    // In a future version, this would process content differently based on type
    return pageContent.content;
  }

  /**
   * Extract text from blocks
   */
  extractTextFromBlocks(blocks, indentLevel = 0) {
    if (!blocks || blocks.length === 0) {
      return '';
    }

    let content = '';
    const indent = '  '.repeat(indentLevel);

    for (const block of blocks) {
      // Extract text from this block
      let blockContent = '';

      if (block.type === 'paragraph') {
        blockContent = this.extractTextFromRichText(block.paragraph.rich_text);
      } else if (block.type === 'heading_1') {
        blockContent = this.extractTextFromRichText(block.heading_1.rich_text);
      } else if (block.type === 'heading_2') {
        blockContent = this.extractTextFromRichText(block.heading_2.rich_text);
      } else if (block.type === 'heading_3') {
        blockContent = this.extractTextFromRichText(block.heading_3.rich_text);
      } else if (block.type === 'bulleted_list_item') {
        blockContent = '• ' + this.extractTextFromRichText(block.bulleted_list_item.rich_text);
      } else if (block.type === 'numbered_list_item') {
        blockContent = '1. ' + this.extractTextFromRichText(block.numbered_list_item.rich_text);
      } else if (block.type === 'to_do') {
        blockContent = `[${block.to_do.checked ? 'x' : ' '}] ` + this.extractTextFromRichText(block.to_do.rich_text);
      } else if (block.type === 'toggle') {
        blockContent = this.extractTextFromRichText(block.toggle.rich_text);
      } else if (block.type === 'child_page') {
        blockContent = `[Page: ${block.child_page.title}]`;
      } else if (block.type === 'child_database') {
        blockContent = `[Database: ${block.child_database.title}]`;
      }

      if (blockContent) {
        content += `${indent}${blockContent}\n`;
      }

      // Add children's content with increased indentation
      if (block.has_children) {
        try {
          const childBlocks = block.children || [];
          content += this.extractTextFromBlocks(childBlocks, indentLevel + 1);
        } catch (error) {
          console.error(`Error processing child blocks:`, error);
        }
      }
    }

    return content;
  }

  /**
   * Extract text from rich text
   */
  extractTextFromRichText(richText) {
    if (!richText || richText.length === 0) {
      return '';
    }

    return richText.map(t => t.plain_text).join('');
  }

  /**
   * Get page blocks recursively
   */
  async getPageBlocksRecursively(pageId, maxDepth = 2, currentDepth = 0) {
    if (currentDepth > maxDepth) {
      return [];
    }

    try {
      const response = await notionApi.getChildBlocks(pageId);
      const blocks = response.results || [];

      // Process children recursively
      for (const block of blocks) {
        if (block.has_children) {
          block.children = await this.getPageBlocksRecursively(block.id, maxDepth, currentDepth + 1);
        }
      }

      return blocks;
    } catch (error) {
      console.error(`Error getting blocks for ${pageId}:`, error);
      return [];
    }
  }
}

// Create singleton instance
const twoStageRetrieval = new TwoStageRetrieval();

module.exports = twoStageRetrieval;
