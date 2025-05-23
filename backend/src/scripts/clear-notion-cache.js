/**
 * Script to clear the Notion cache
 * 
 * This script clears the Notion cache and forces a refresh.
 */

// Import the Notion cache
const notionCache = require('../integrations/notion/cache');

// Clear the cache
console.log('Clearing Notion cache...');

// Reset all cache data structures
notionCache.pages.clear();
notionCache.databases.clear();
notionCache.databaseItems.clear();
notionCache.searchIndex = { title: {}, content: {} };

// Reset initialization flags
notionCache.isInitialized = false;
notionCache.isLoading = false;
notionCache.lastRefreshTime = null;

console.log('✅ Notion cache cleared successfully');
console.log('The cache will be reinitialized when the server starts');
