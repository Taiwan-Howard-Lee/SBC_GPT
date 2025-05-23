/**
 * Page Mapper
 * 
 * Maps Notion page IDs to the defined workspace structure.
 * Uses fuzzy matching for titles and provides fallback classification.
 */

const notionApi = require('./api');
const notionUtils = require('./utils');
const WORKSPACE_STRUCTURE = require('./workspaceStructure');

class PageMapper {
  constructor() {
    this.pageIdMap = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the page mapper
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      this.pageIdMap = await this.buildPageIdMap();
      this.initialized = true;
      console.log(`Page mapper initialized with ${Object.keys(this.pageIdMap).length} pages`);
    } catch (error) {
      console.error('Error initializing page mapper:', error);
      throw error;
    }
  }
  
  /**
   * Build the page ID map
   */
  async buildPageIdMap() {
    // Get all pages (just metadata)
    const pages = await this.getAllPageMetadata();
    
    // Create mapping
    const pageIdMap = {};
    
    // Process each page
    for (const page of pages) {
      const pageId = page.id;
      const pageTitle = notionUtils.getPageTitle(page);
      
      // Try to match to our known structure
      let matched = false;
      
      // Check if it's a main section
      for (const [sectionKey, section] of Object.entries(WORKSPACE_STRUCTURE.sections)) {
        if (this.titleMatches(pageTitle, section.title)) {
          pageIdMap[pageId] = {
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
            pageIdMap[pageId] = {
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
      
      // If not matched to known structure, try to classify by content
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
        
        pageIdMap[pageId] = {
          type: 'UNKNOWN_PAGE',
          documentType,
          title: pageTitle,
          parent: page.parent
        };
      }
    }
    
    return pageIdMap;
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
        const response = await notionApi.search({
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
        console.error('Error fetching page metadata:', error);
        // Break the loop on error
        hasMore = false;
      }
    }
    
    return pages;
  }
  
  /**
   * Check if titles match (fuzzy matching)
   */
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
    
    // Could add more sophisticated fuzzy matching if needed
    
    return false;
  }
  
  /**
   * Get mapping for a specific page ID
   */
  getPageMapping(pageId) {
    if (!this.initialized) {
      throw new Error('Page mapper not initialized');
    }
    
    return this.pageIdMap[pageId] || null;
  }
  
  /**
   * Get all pages for a specific section
   */
  getPagesForSection(sectionKey) {
    if (!this.initialized) {
      throw new Error('Page mapper not initialized');
    }
    
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
  
  /**
   * Get all pages of a specific document type
   */
  getPagesOfType(documentType) {
    if (!this.initialized) {
      throw new Error('Page mapper not initialized');
    }
    
    const pages = [];
    
    for (const [pageId, mapping] of Object.entries(this.pageIdMap)) {
      if (mapping.documentType === documentType) {
        pages.push(pageId);
      }
    }
    
    return pages;
  }
  
  /**
   * Classify a page based on its content
   */
  async classifyPage(pageId, content) {
    // Default classification
    let documentType = 'GENERAL_INFO';
    
    // Check for document type patterns in content
    for (const [typeKey, typeInfo] of Object.entries(WORKSPACE_STRUCTURE.documentTypes)) {
      for (const term of typeInfo.keyTerms) {
        if (content.toLowerCase().includes(term)) {
          documentType = typeKey;
          break;
        }
      }
    }
    
    // Update the page mapping if it exists
    if (this.pageIdMap[pageId]) {
      this.pageIdMap[pageId].documentType = documentType;
    }
    
    return documentType;
  }
}

// Create singleton instance
const pageMapper = new PageMapper();

module.exports = pageMapper;
