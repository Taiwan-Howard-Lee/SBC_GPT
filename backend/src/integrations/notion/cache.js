/**
 * Notion Cache System
 *
 * This module provides a caching system for Notion content.
 * It loads the entire Notion database at server startup,
 * creates an optimized search structure, and refreshes periodically.
 */
const notionApi = require('./api');
const notionUtils = require('./utils');

class NotionCache {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.lastRefreshTime = null;
    this.refreshInterval = 60 * 60 * 1000; // 1 hour in milliseconds

    // Main data structures
    this.pages = new Map(); // Map of page ID to page content
    this.databases = new Map(); // Map of database ID to database content
    this.databaseItems = new Map(); // Map of database ID to array of items

    // Search index (inverted index)
    this.searchIndex = {
      title: {}, // Map of word to array of page/database IDs
      content: {} // Map of word to array of page/database IDs
    };

    // Configuration
    this.databaseIds = process.env.NOTION_DATABASE_IDS
      ? process.env.NOTION_DATABASE_IDS.split(',').map(id => {
          // Format IDs with dashes if they don't have them
          if (id && !id.includes('-') && id.length === 32) {
            return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
          }
          return id;
        })
      : [];
  }

  /**
   * Initialize the cache by loading all Notion content
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize() {
    // If already initialized, return success
    if (this.isInitialized) {
      console.log('📋 Notion cache is already initialized and ready to use');
      return true;
    }

    // If already loading, just return
    if (this.isLoading) {
      console.log('⏳ Notion cache is already being loaded, skipping duplicate initialization');
      return false;
    }

    this.isLoading = true;
    console.log('🔄 Starting Notion cache initialization...');

    try {
      // Start with a clean slate
      this.pages.clear();
      this.databases.clear();
      this.databaseItems.clear();
      this.searchIndex = { title: {}, content: {} };

      // Load all databases specified in the environment variables
      // Only if there are valid database IDs and they're not empty strings
      if (this.databaseIds.length > 0 && this.databaseIds[0].trim() !== '') {
        console.log(`📚 Loading ${this.databaseIds.length} specified databases...`);
        for (const databaseId of this.databaseIds) {
          try {
            await this.loadDatabase(databaseId);
          } catch (error) {
            console.warn(`⚠️ Failed to load database ${databaseId}, continuing with other databases: ${error.message}`);
          }
        }
      } else {
        console.log('ℹ️ No specific database IDs configured, skipping database loading');
      }

      // Perform a general search to find other pages
      console.log('🔍 Loading all pages from Notion...');
      await this.loadAllPages();

      // Mark as initialized
      this.isInitialized = true;
      this.lastRefreshTime = new Date();

      console.log(`✅ Notion cache successfully initialized with ${this.pages.size} pages and ${this.databases.size} databases`);

      // Schedule periodic refresh
      this.scheduleRefresh();
      return true;
    } catch (error) {
      console.error('❌ Error initializing Notion cache:', error);
      console.log('ℹ️ The server will continue to function using direct API calls');
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Schedule periodic refresh of the cache
   */
  scheduleRefresh() {
    setInterval(() => {
      this.refresh()
        .then(success => {
          if (success) {
            console.log('Notion cache refreshed successfully');
          } else {
            console.error('Failed to refresh Notion cache');
          }
        })
        .catch(error => {
          console.error('Error during Notion cache refresh:', error);
        });
    }, this.refreshInterval);
  }

  /**
   * Refresh the cache
   * @returns {Promise<boolean>} - Whether refresh was successful
   */
  async refresh() {
    if (this.isLoading) {
      return false;
    }

    console.log('Refreshing Notion cache...');
    this.isLoading = true;

    try {
      // We'll use the same initialization logic
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Error refreshing Notion cache:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load a specific database and its items
   * @param {string} databaseId - Notion database ID
   */
  async loadDatabase(databaseId) {
    try {
      console.log(`Loading database ${databaseId}...`);

      // Get database structure
      const database = await notionApi.getDatabase(databaseId);
      this.databases.set(databaseId, database);

      // Index the database title
      this.indexText('title', databaseId, database.title ? notionUtils.extractTextFromTitle(database.title) : '');

      // Get all items from the database
      const items = await this.loadAllDatabaseItems(databaseId);
      this.databaseItems.set(databaseId, items);

      console.log(`Loaded database ${databaseId} with ${items.length} items`);
    } catch (error) {
      console.error(`Error loading database ${databaseId}:`, error);
    }
  }

  /**
   * Load all items from a database
   * @param {string} databaseId - Notion database ID
   * @returns {Promise<Array>} - Array of database items
   */
  async loadAllDatabaseItems(databaseId) {
    const allItems = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      try {
        const response = await notionApi.queryDatabase(databaseId, {}, [], 100, startCursor);
        const items = notionUtils.formatDatabaseItems(response);

        // Process each item
        for (const item of items) {
          allItems.push(item);

          // Index the item title
          this.indexText('title', item.id, item.title);

          // Load and index the item content
          await this.loadPageContent(item.id);
        }

        // Check if there are more items
        hasMore = response.has_more;
        startCursor = response.next_cursor;
      } catch (error) {
        console.error(`Error loading database items for ${databaseId}:`, error);
        hasMore = false;
      }
    }

    return allItems;
  }

  /**
   * Load all pages from Notion
   */
  async loadAllPages() {
    try {
      // Use search with empty query to get all pages
      const response = await notionApi.search('');
      const results = notionUtils.formatSearchResults(response);

      let loadedCount = 0;

      for (const result of results) {
        // Skip if we already have this page or database
        if (this.pages.has(result.id) || this.databases.has(result.id)) {
          continue;
        }

        // Index the title
        this.indexText('title', result.id, result.title);

        if (result.type === 'page') {
          // Load and index the page content
          await this.loadPageContent(result.id);
          loadedCount++;
        } else if (result.type === 'database' && !this.databases.has(result.id)) {
          // Load the database if we haven't already
          await this.loadDatabase(result.id);
          loadedCount++;
        }
      }

      console.log(`📄 Loaded ${loadedCount} additional pages/databases from Notion`);
    } catch (error) {
      console.error('❌ Error loading all pages:', error);
    }
  }

  /**
   * Load content for a specific page
   * @param {string} pageId - Notion page ID
   */
  async loadPageContent(pageId) {
    try {
      // Skip if we already have this page
      if (this.pages.has(pageId)) {
        return;
      }

      // Get page data
      const page = await notionApi.getPage(pageId);

      // Get page content with deep traversal
      const pageStructure = await this.traversePageContent(pageId, 0, 5); // Max depth of 5 levels

      // Extract text content
      const content = this.extractContentFromStructure(pageStructure);

      // Store the page
      this.pages.set(pageId, {
        id: pageId,
        title: page.properties?.title ? notionUtils.extractTextFromTitle(page.properties.title) : '',
        content,
        structure: pageStructure,
        url: `https://notion.so/${pageId.replace(/-/g, '')}`
      });

      // Index the content
      this.indexText('content', pageId, content);
    } catch (error) {
      console.error(`Error loading page content for ${pageId}:`, error);
    }
  }

  /**
   * Traverse page content recursively
   * @param {string} blockId - Block ID to start from
   * @param {number} currentDepth - Current depth in the traversal
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Promise<Array>} - Structured content
   */
  async traversePageContent(blockId, currentDepth = 0, maxDepth = 5) {
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

        // Check if this block has children
        if (block.has_children) {
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
   * Extract text content from structured page content
   * @param {Array} structure - Structured content
   * @param {number} indentLevel - Current indentation level
   * @returns {string} - Extracted text content
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

  /**
   * Index text for searching
   * @param {string} type - Type of text ('title' or 'content')
   * @param {string} id - Page or database ID
   * @param {string} text - Text to index
   */
  indexText(type, id, text) {
    if (!text) return;

    // Tokenize the text
    const words = this.tokenize(text);

    // Add each word to the index
    for (const word of words) {
      if (!this.searchIndex[type][word]) {
        this.searchIndex[type][word] = new Set();
      }
      this.searchIndex[type][word].add(id);
    }
  }

  /**
   * Tokenize text into searchable words
   * @param {string} text - Text to tokenize
   * @returns {Array} - Array of words
   */
  tokenize(text) {
    if (!text) return [];

    // Convert to lowercase and split by non-alphanumeric characters
    return text.toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out short words
  }

  /**
   * Search the cache for relevant content
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} - Search results
   */
  search(query, options = {}) {
    if (!this.isInitialized) {
      console.warn('Notion cache not initialized, search may be incomplete');
    }

    // Default options
    const defaultOptions = {
      maxResults: 10,
      titleWeight: 2, // Title matches are weighted higher
      contentWeight: 1
    };

    const searchOptions = { ...defaultOptions, ...options };

    // Tokenize the query
    const queryWords = this.tokenize(query);
    if (queryWords.length === 0) {
      return this.getRecentItems(searchOptions.maxResults);
    }

    // Score each page and database
    const scores = new Map();

    // Search in titles
    for (const word of queryWords) {
      const matchingIds = this.searchIndex.title[word];
      if (matchingIds) {
        for (const id of matchingIds) {
          scores.set(id, (scores.get(id) || 0) + searchOptions.titleWeight);
        }
      }
    }

    // Search in content
    for (const word of queryWords) {
      const matchingIds = this.searchIndex.content[word];
      if (matchingIds) {
        for (const id of matchingIds) {
          scores.set(id, (scores.get(id) || 0) + searchOptions.contentWeight);
        }
      }
    }

    // Sort by score
    const sortedResults = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, searchOptions.maxResults);

    // Convert to result objects
    return sortedResults.map(([id, score]) => {
      if (this.pages.has(id)) {
        const page = this.pages.get(id);
        return {
          id,
          type: 'page',
          title: page.title,
          url: page.url,
          score
        };
      } else if (this.databases.has(id)) {
        const database = this.databases.get(id);
        return {
          id,
          type: 'database',
          title: database.title ? notionUtils.extractTextFromTitle(database.title) : 'Untitled Database',
          url: `https://notion.so/${id.replace(/-/g, '')}`,
          score
        };
      }
      return null;
    }).filter(result => result !== null);
  }

  /**
   * Get recent items when no search query is provided
   * @param {number} limit - Maximum number of items to return
   * @returns {Array} - Recent items
   */
  getRecentItems(limit = 10) {
    const results = [];

    // Add pages
    for (const [id, page] of this.pages.entries()) {
      results.push({
        id,
        type: 'page',
        title: page.title,
        url: page.url,
        score: 0
      });

      if (results.length >= limit) {
        return results;
      }
    }

    // Add databases
    for (const [id, database] of this.databases.entries()) {
      results.push({
        id,
        type: 'database',
        title: database.title ? notionUtils.extractTextFromTitle(database.title) : 'Untitled Database',
        url: `https://notion.so/${id.replace(/-/g, '')}`,
        score: 0
      });

      if (results.length >= limit) {
        return results;
      }
    }

    return results;
  }

  /**
   * Get content for a specific page or database
   * @param {string} id - Page or database ID
   * @returns {Object|null} - Content data or null if not found
   */
  getContent(id) {
    if (this.pages.has(id)) {
      return this.pages.get(id);
    } else if (this.databases.has(id)) {
      const database = this.databases.get(id);
      const items = this.databaseItems.get(id) || [];

      return {
        id,
        type: 'database',
        title: database.title ? notionUtils.extractTextFromTitle(database.title) : 'Untitled Database',
        url: `https://notion.so/${id.replace(/-/g, '')}`,
        content: `Database with ${items.length} items`,
        items
      };
    }

    return null;
  }

  /**
   * Get memory usage statistics
   * @returns {Object} - Memory usage statistics
   */
  getMemoryUsage() {
    return {
      pages: this.pages.size,
      databases: this.databases.size,
      databaseItems: Array.from(this.databaseItems.values()).reduce((total, items) => total + items.length, 0),
      indexedTitleWords: Object.keys(this.searchIndex.title).length,
      indexedContentWords: Object.keys(this.searchIndex.content).length,
      lastRefreshTime: this.lastRefreshTime
    };
  }
}

// Create a singleton instance
const notionCache = new NotionCache();

module.exports = notionCache;
