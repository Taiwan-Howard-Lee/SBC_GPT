/**
 * Structure-Aware Search
 * 
 * Implements search functionality that leverages the workspace structure
 * to find the most relevant content for a query.
 */

const WORKSPACE_STRUCTURE = require('./workspaceStructure');
const pageMapper = require('./pageMapper');
const notionApi = require('./api');
const notionUtils = require('./utils');
const notionCache = require('./cache');

class StructuredSearch {
  constructor() {
    this.initialized = false;
  }
  
  /**
   * Initialize the structured search
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    // Make sure page mapper is initialized
    await pageMapper.initialize();
    
    this.initialized = true;
    console.log('Structured search initialized');
  }
  
  /**
   * Perform a structure-aware search
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Structured search not initialized');
    }
    
    // Default options
    const defaultOptions = {
      maxResults: 5,
      includeContent: false
    };
    
    const searchOptions = { ...defaultOptions, ...options };
    
    // Analyze query to determine relevant sections
    const relevantSections = this.findRelevantSections(query);
    
    // Perform search with section prioritization
    const results = [];
    
    // First search in highly relevant sections
    for (const sectionKey of relevantSections.highRelevance) {
      const sectionResults = await this.searchInSection(query, sectionKey, searchOptions);
      results.push(...sectionResults);
      
      // Stop if we have enough results
      if (results.length >= searchOptions.maxResults) {
        break;
      }
    }
    
    // If we don't have enough results, try medium relevance sections
    if (results.length < searchOptions.maxResults) {
      for (const sectionKey of relevantSections.mediumRelevance) {
        const sectionResults = await this.searchInSection(query, sectionKey, searchOptions);
        results.push(...sectionResults);
        
        // Stop if we have enough results
        if (results.length >= searchOptions.maxResults) {
          break;
        }
      }
    }
    
    // If we still don't have enough results, try low relevance sections
    if (results.length < searchOptions.maxResults) {
      for (const sectionKey of relevantSections.lowRelevance) {
        const sectionResults = await this.searchInSection(query, sectionKey, searchOptions);
        results.push(...sectionResults);
        
        // Stop if we have enough results
        if (results.length >= searchOptions.maxResults) {
          break;
        }
      }
    }
    
    // If we still don't have enough results, try a general search
    if (results.length < searchOptions.maxResults) {
      const generalResults = await this.performGeneralSearch(query, searchOptions);
      results.push(...generalResults);
    }
    
    // Deduplicate and sort by relevance
    return this.deduplicateAndSort(results).slice(0, searchOptions.maxResults);
  }
  
  /**
   * Find relevant sections based on query
   */
  findRelevantSections(query) {
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
  
  /**
   * Search within a specific section
   */
  async searchInSection(query, sectionKey, options) {
    const section = WORKSPACE_STRUCTURE.sections[sectionKey];
    
    // Get page IDs for this section and its children
    const pageIds = pageMapper.getPagesForSection(sectionKey);
    
    // Search within these pages
    const results = [];
    
    for (const pageId of pageIds) {
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
          
          // Get page content if requested
          let content = '';
          if (options.includeContent) {
            const pageStructure = await this.traversePageContent(pageId, 0, 3); // Reduced depth for efficiency
            content = this.extractContentFromStructure(pageStructure);
          }
          
          pageContent = {
            id: pageId,
            title: pageTitle,
            content,
            url: `https://notion.so/${pageId.replace(/-/g, '')}`
          };
        }
        
        // Calculate relevance
        const relevance = this.calculateRelevance(query, pageContent, sectionKey);
        
        if (relevance > 0) {
          results.push({
            pageId,
            title: pageContent.title,
            relevance,
            section: sectionKey,
            preview: this.generatePreview(pageContent.content, query),
            url: pageContent.url
          });
        }
      } catch (error) {
        console.error(`Error searching in page ${pageId}:`, error);
      }
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }
  
  /**
   * Perform a general search across all content
   */
  async performGeneralSearch(query, options) {
    try {
      // First try using the cache if it's initialized
      if (notionCache.isInitialized) {
        const cacheResults = notionCache.search(query);
        
        if (cacheResults.length > 0) {
          return cacheResults.map(result => ({
            pageId: result.id,
            title: result.title,
            relevance: result.score,
            section: 'general',
            preview: '',
            url: result.url
          }));
        }
      }
      
      // Fall back to direct API search
      const searchResponse = await notionApi.search(query);
      const apiResults = notionUtils.formatSearchResults(searchResponse);
      
      return apiResults.map(result => ({
        pageId: result.id,
        title: result.title,
        relevance: 1, // Default relevance
        section: 'general',
        preview: '',
        url: result.url
      }));
    } catch (error) {
      console.error('Error performing general search:', error);
      return [];
    }
  }
  
  /**
   * Calculate relevance of a page to a query
   */
  calculateRelevance(query, pageContent, sectionKey) {
    const queryLower = query.toLowerCase();
    const titleLower = pageContent.title.toLowerCase();
    const contentLower = pageContent.content ? pageContent.content.toLowerCase() : '';
    
    let relevance = 0;
    
    // Title match is highly relevant
    if (titleLower.includes(queryLower)) {
      relevance += 5;
    }
    
    // Check for query terms in title
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        relevance += 2;
      }
    }
    
    // Check for query terms in content
    if (contentLower) {
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          relevance += 1;
          
          // Bonus for multiple occurrences
          const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length;
          if (occurrences > 1) {
            relevance += Math.min(occurrences / 2, 3); // Cap at 3 bonus points
          }
        }
      }
    }
    
    // Section relevance bonus
    const section = WORKSPACE_STRUCTURE.sections[sectionKey];
    if (section) {
      // Check if content contains section key terms
      for (const term of section.keyTerms) {
        if (contentLower.includes(term)) {
          relevance += 0.5;
        }
      }
    }
    
    return relevance;
  }
  
  /**
   * Generate a preview of content focused on the query
   */
  generatePreview(content, query) {
    if (!content) return '';
    
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Find the position of the query in the content
    const position = contentLower.indexOf(queryLower);
    
    if (position === -1) {
      // If query not found directly, look for terms
      const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
      
      for (const term of queryTerms) {
        const termPosition = contentLower.indexOf(term);
        if (termPosition !== -1) {
          // Found a term, extract context around it
          const start = Math.max(0, termPosition - 100);
          const end = Math.min(content.length, termPosition + term.length + 100);
          return content.substring(start, end) + '...';
        }
      }
      
      // If no terms found, return the beginning of the content
      return content.substring(0, 200) + '...';
    }
    
    // Extract context around the query
    const start = Math.max(0, position - 100);
    const end = Math.min(content.length, position + queryLower.length + 100);
    return content.substring(start, end) + '...';
  }
  
  /**
   * Deduplicate and sort search results
   */
  deduplicateAndSort(results) {
    // Deduplicate by pageId
    const uniqueResults = [];
    const seenIds = new Set();
    
    for (const result of results) {
      if (!seenIds.has(result.pageId)) {
        uniqueResults.push(result);
        seenIds.add(result.pageId);
      }
    }
    
    // Sort by relevance
    return uniqueResults.sort((a, b) => b.relevance - a.relevance);
  }
  
  /**
   * Traverse page content recursively (simplified version)
   */
  async traversePageContent(blockId, currentDepth = 0, maxDepth = 3) {
    // Stop if we've reached the maximum depth
    if (currentDepth > maxDepth) {
      return [];
    }
    
    try {
      // Get the blocks at this level
      const response = await notionApi.getChildBlocks(blockId);
      const blocks = response.results || [];
      
      if (blocks.length === 0) {
        return [];
      }
      
      // Process each block
      const structuredContent = [];
      
      for (const block of blocks) {
        // Extract text from this block
        const blockContent = notionUtils.extractTextFromBlock(block);
        
        // Create a structure entry for this block
        const blockEntry = {
          id: block.id,
          type: block.type,
          content: blockContent,
          children: []
        };
        
        // Check if this block has children and is important enough to traverse
        if (block.has_children && this.shouldTraverseBlock(block.type, currentDepth)) {
          // Recursively get children
          blockEntry.children = await this.traversePageContent(
            block.id,
            currentDepth + 1,
            maxDepth
          );
        }
        
        structuredContent.push(blockEntry);
      }
      
      return structuredContent;
    } catch (error) {
      console.error(`Error traversing content at depth ${currentDepth}:`, error);
      return [];
    }
  }
  
  /**
   * Determine if a block should be traversed based on its type and depth
   */
  shouldTraverseBlock(blockType, currentDepth) {
    // Always traverse at shallow depths
    if (currentDepth < 2) return true;
    
    // Check if this block type is important enough to traverse deeper
    const blockTypeInfo = WORKSPACE_STRUCTURE.blockTypes[blockType];
    if (blockTypeInfo && (blockTypeInfo.importance === 'high' || blockTypeInfo.contentType === 'reference')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Extract text content from structured page content
   */
  extractContentFromStructure(structure, indentLevel = 0) {
    if (!structure || structure.length === 0) {
      return '';
    }
    
    let content = '';
    const indent = '  '.repeat(indentLevel);
    
    for (const block of structure) {
      // Add this block's content
      if (block.content) {
        content += `${indent}${block.content}\n`;
      }
      
      // Add children's content with increased indentation
      if (block.children && block.children.length > 0) {
        content += this.extractContentFromStructure(block.children, indentLevel + 1);
      }
    }
    
    return content;
  }
}

// Create singleton instance
const structuredSearch = new StructuredSearch();

module.exports = structuredSearch;
