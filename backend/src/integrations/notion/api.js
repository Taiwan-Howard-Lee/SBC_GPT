/**
 * Notion API Integration
 * 
 * This module provides a wrapper around the Notion API client
 * with methods for common operations.
 */
const { Client } = require('@notionhq/client');
require('dotenv').config();

// Get Notion API key from environment variables
const apiKey = process.env.NOTION_API_KEY;

// Initialize the client if API key is available
let client = null;
if (apiKey) {
  client = new Client({ auth: apiKey });
}

/**
 * Check if the Notion client is configured
 * @returns {boolean} - Whether the client is configured
 */
const isConfigured = () => {
  return !!client;
};

/**
 * Search Notion content
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
const search = async (query, options = {}) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.search({
      query,
      ...options
    });
    
    return response;
  } catch (error) {
    console.error('Error searching Notion:', error);
    throw error;
  }
};

/**
 * Get a page by ID
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} - Page data
 */
const getPage = async (pageId) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.pages.retrieve({
      page_id: pageId
    });
    
    return response;
  } catch (error) {
    console.error(`Error getting Notion page ${pageId}:`, error);
    throw error;
  }
};

/**
 * Get page content (blocks)
 * @param {string} pageId - Notion page ID
 * @returns {Promise<Object>} - Page blocks
 */
const getPageContent = async (pageId) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.blocks.children.list({
      block_id: pageId
    });
    
    return response;
  } catch (error) {
    console.error(`Error getting content for Notion page ${pageId}:`, error);
    throw error;
  }
};

/**
 * Get a database by ID
 * @param {string} databaseId - Notion database ID
 * @returns {Promise<Object>} - Database data
 */
const getDatabase = async (databaseId) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.databases.retrieve({
      database_id: databaseId
    });
    
    return response;
  } catch (error) {
    console.error(`Error getting Notion database ${databaseId}:`, error);
    throw error;
  }
};

/**
 * Query a database
 * @param {string} databaseId - Notion database ID
 * @param {Object} filter - Filter criteria
 * @param {Array} sorts - Sort criteria
 * @returns {Promise<Object>} - Query results
 */
const queryDatabase = async (databaseId, filter = {}, sorts = []) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter,
      sorts
    });
    
    return response;
  } catch (error) {
    console.error(`Error querying Notion database ${databaseId}:`, error);
    throw error;
  }
};

/**
 * Get a block by ID
 * @param {string} blockId - Notion block ID
 * @returns {Promise<Object>} - Block data
 */
const getBlock = async (blockId) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.blocks.retrieve({
      block_id: blockId
    });
    
    return response;
  } catch (error) {
    console.error(`Error getting Notion block ${blockId}:`, error);
    throw error;
  }
};

/**
 * Get child blocks of a block
 * @param {string} blockId - Parent block ID
 * @returns {Promise<Object>} - Child blocks
 */
const getChildBlocks = async (blockId) => {
  if (!isConfigured()) {
    throw new Error('Notion API is not configured');
  }

  try {
    const response = await client.blocks.children.list({
      block_id: blockId
    });
    
    return response;
  } catch (error) {
    console.error(`Error getting child blocks for ${blockId}:`, error);
    throw error;
  }
};

module.exports = {
  isConfigured,
  search,
  getPage,
  getPageContent,
  getDatabase,
  queryDatabase,
  getBlock,
  getChildBlocks
};
