/**
 * Adaptive Structure for Notion Integration
 *
 * This module implements an adaptive approach to Notion integration
 * that works with workspaces where titles may not be accessible.
 * It focuses on hierarchical relationships rather than titles.
 */

const notionApi = require('./api');
const notionCache = require('./cache');

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
      console.log('Adaptive structure already initialized');
      return true;
    }

    try {
      console.log('Initializing adaptive structure for Notion...');

      // Mark as initialized early to prevent blocking operations
      this.initialized = true;

      // Build initial hierarchy (lightweight) in the background
      this.buildInitialHierarchyInBackground();

      console.log('Adaptive structure marked as initialized (continuing in background)');
      return true;
    } catch (error) {
      console.error('Error initializing adaptive structure:', error);
      // Mark as initialized anyway to prevent blocking operations
      this.initialized = true;
      console.log('Adaptive structure marked as initialized despite errors');
      return false;
    }
  }

  /**
   * Build the initial hierarchy in the background
   */
  async buildInitialHierarchyInBackground() {
    try {
      // Build initial hierarchy (lightweight)
      await this.buildInitialHierarchy();
      console.log(`Adaptive structure fully initialized with ${this.topLevelPages.length} top-level pages`);
    } catch (error) {
      console.error('Error building initial hierarchy in background:', error);
      console.log('Adaptive structure will continue to function with limited data');
    }
  }

  /**
   * Build the initial hierarchy (lightweight)
   */
  async buildInitialHierarchy() {
    // Get all pages (just metadata)
    const pages = await this.getAllPageMetadata();
    console.log(`Retrieved ${pages.length} pages from Notion`);

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

    console.log(`Found ${this.topLevelPages.length} top-level pages`);
    console.log(`Built parent-child relationships for ${Object.keys(this.pageChildren).length} parent pages`);
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
        // Search for pages
        const response = await notionApi.search('', {
          page_size: 100,
          filter: {
            value: 'page',
            property: 'object'
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
      const response = await notionApi.getChildBlocks(pageId);
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
      console.error(`Error getting children for page ${pageId}:`, error);
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
        console.error(`Error getting children while tracking access for ${pageId}:`, error);
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

// Create singleton instance
const adaptiveStructure = new AdaptiveStructure();

module.exports = adaptiveStructure;
