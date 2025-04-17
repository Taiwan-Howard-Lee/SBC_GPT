/**
 * Notion Agent
 *
 * This agent handles queries related to Notion content.
 * It uses the Notion API to search and retrieve information,
 * and Gemini to make decisions about navigation and content processing.
 */
const BaseAgent = require('./baseAgent');
const notionApi = require('../integrations/notion/api');
const notionUtils = require('../integrations/notion/utils');
const { processMessage } = require('../services/geminiService');

class NotionAgent extends BaseAgent {
  constructor() {
    super('notion', 'Notion Knowledge Base');

    // Check if Notion API is configured
    this.isConfigured = notionApi.isConfigured();

    if (!this.isConfigured) {
      console.warn('Notion agent created but API is not configured. Set NOTION_API_KEY in .env');
    }

    // Load database IDs from environment variables
    this.databaseIds = process.env.NOTION_DATABASE_IDS
      ? process.env.NOTION_DATABASE_IDS.split(',')
      : [];

    if (this.databaseIds.length === 0) {
      console.warn('No Notion database IDs configured. Set NOTION_DATABASE_IDS in .env');
    }
  }

  /**
   * Check if this agent can handle a specific query
   * @param {string} query - The query from the central router
   * @param {Object} context - Additional context
   * @returns {Promise<boolean>} - Whether this agent can handle the query
   */
  async canHandle(query, context = {}) {
    if (!this.isConfigured || !this.isActive) {
      return false;
    }

    // The central router has already determined this agent should handle the query
    // We just need to verify we're properly configured to do so
    return true;
  }

  /**
   * Process a query and return a response
   * @param {string} query - The query from the central router
   * @param {Object} context - Additional context including the original user query
   * @returns {Promise<Object>} - The agent's response
   */
  async processQuery(query, context = {}) {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Notion agent is not configured. Please set NOTION_API_KEY in .env'
      };
    }

    try {
      console.log(`Notion agent processing query: "${query}"`);

      // The query has already been refined by the central router
      // We can use it directly or further refine it for Notion-specific search

      // Step 1: Use LLM to extract search terms from the query
      const searchTerms = await this.extractSearchTerms(query);
      console.log(`Extracted search terms: "${searchTerms}"`);

      // Step 2: Perform initial search
      const searchResults = await this.performSearch(searchTerms);
      console.log(`Found ${searchResults.length} initial results in Notion`);

      if (searchResults.length === 0) {
        return {
          success: false,
          message: `I couldn't find any information about "${searchTerms}" in Notion.`
        };
      }

      // Step 3: Use LLM to decide which result(s) to explore further
      const relevantResults = await this.identifyRelevantResults(searchResults, query);
      console.log(`Identified ${relevantResults.length} relevant results`);

      if (relevantResults.length === 0) {
        return {
          success: false,
          message: `I found some results for "${searchTerms}" in Notion, but none seem relevant to your query.`
        };
      }

      // Step 4: Retrieve content for the most relevant result
      const contentData = await this.retrieveContent(relevantResults[0], query);
      console.log(`Retrieved content for "${contentData.title}"`);

      // Step 5: Format the response using LLM
      const response = await this.formatResponse(query, contentData, relevantResults);

      return {
        success: true,
        message: response,
        data: {
          results: relevantResults,
          content: contentData
        }
      };
    } catch (error) {
      console.error('Error in Notion agent:', error);
      return {
        success: false,
        message: `Error processing your query: ${error.message}`
      };
    }
  }

  /**
   * Extract search terms from a natural language query using LLM
   * @param {string} query - The user's query
   * @returns {Promise<string>} - Extracted search terms
   */
  async extractSearchTerms(query) {
    try {
      // Simple extraction for queries that explicitly mention Notion
      const notionPattern = /\b(?:in|from|on)\s+notion\b/i;
      if (notionPattern.test(query)) {
        // Remove the "in Notion" part
        const cleanedQuery = query.replace(notionPattern, '').trim();
        // Remove question marks and other punctuation
        const searchTerms = cleanedQuery.replace(/[?!.,;:]/g, '').trim();
        return searchTerms;
      }

      // For other queries, use a more direct approach
      const prompt = [
        {
          role: 'system',
          content: `Extract the main search terms from the query.
          Return ONLY the key words or phrases that should be used for searching, with no formatting, bullets, or explanations.
          For example:
          Query: "Who is the CEO of Apple?"
          Response: "CEO Apple"

          Query: "What are the best practices for project management?"
          Response: "best practices project management"`
        },
        {
          role: 'user',
          content: `Extract search terms from: "${query}"`
        }
      ];

      const response = await processMessage(prompt);
      return response.content.trim();
    } catch (error) {
      console.error('Error extracting search terms:', error);
      // Fallback to simple extraction
      return query.replace(/^(find|search for|look up|tell me about|what is|how to)/i, '')
                 .replace(/[?!.,;:]/g, '')
                 .replace(/\b(?:in|from|on)\s+notion\b/i, '')
                 .trim();
    }
  }

  /**
   * Perform a search in Notion
   * @param {string} searchTerms - Terms to search for
   * @returns {Promise<Array>} - Formatted search results
   */
  async performSearch(searchTerms) {
    try {
      // First try searching across all content
      const searchResponse = await notionApi.search(searchTerms);
      let results = notionUtils.formatSearchResults(searchResponse);

      // If we have specific database IDs and no results, try querying each database
      if (results.length === 0 && this.databaseIds.length > 0) {
        for (const databaseId of this.databaseIds) {
          try {
            // Create a filter for the search terms
            // This is a simplified filter - in a real implementation,
            // you might want to search across multiple properties
            const filter = {
              or: [
                {
                  property: 'title',
                  rich_text: {
                    contains: searchTerms
                  }
                },
                {
                  property: 'Name',
                  rich_text: {
                    contains: searchTerms
                  }
                }
              ]
            };

            const queryResponse = await notionApi.queryDatabase(databaseId, filter);
            const dbResults = notionUtils.formatDatabaseItems(queryResponse);

            results = [...results, ...dbResults];
          } catch (error) {
            console.error(`Error querying database ${databaseId}:`, error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error performing Notion search:', error);
      throw error;
    }
  }

  /**
   * Identify which search results are most relevant to the query
   * @param {Array} results - Search results
   * @param {string} query - Original query
   * @returns {Promise<Array>} - Filtered and ranked results
   */
  async identifyRelevantResults(results, query) {
    if (results.length === 0) {
      return [];
    }

    // If we only have one result, return it
    if (results.length === 1) {
      return results;
    }

    try {
      // Format results for the LLM
      const formattedResults = results.map((result, index) => {
        return `${index + 1}. ${result.title} (${result.type})`;
      }).join('\n');

      const prompt = [
        {
          role: 'system',
          content: `You are an AI assistant that helps identify which search results are most relevant to a user's query.
          You will be given a list of search results and a query.
          Your task is to identify the indices of the most relevant results, in order of relevance.
          Respond with ONLY the indices (numbers) of the relevant results, separated by commas.
          If none are relevant, respond with "none".`
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nSearch Results:\n${formattedResults}\n\nWhich results are most relevant to the query? List the indices in order of relevance.`
        }
      ];

      const response = await processMessage(prompt);
      const relevantIndices = response.content
        .replace(/[^0-9,]/g, '') // Remove anything that's not a number or comma
        .split(',')
        .map(num => parseInt(num.trim(), 10) - 1) // Convert to 0-based indices
        .filter(index => !isNaN(index) && index >= 0 && index < results.length);

      // Return the relevant results in the order specified
      return relevantIndices.map(index => results[index]);
    } catch (error) {
      console.error('Error identifying relevant results:', error);
      // Fallback to returning all results
      return results;
    }
  }

  /**
   * Retrieve content for a specific result
   * @param {Object} result - Search result
   * @param {string} query - Original query
   * @returns {Promise<Object>} - Content data
   */
  async retrieveContent(result, query) {
    try {
      const contentData = {
        id: result.id,
        type: result.type,
        title: result.title,
        url: result.url,
        content: '',
        structure: [] // To track the page structure
      };

      if (result.type === 'page') {
        // Get page content with deep traversal
        const pageStructure = await this.traversePageContent(result.id, 0, 3); // Max depth of 3 levels
        contentData.structure = pageStructure;

        // Extract all text content from the structure
        contentData.content = this.extractContentFromStructure(pageStructure);

        // If the content is empty or very short, try to get more information from properties
        if (!contentData.content || contentData.content.length < 100) {
          // This could be a database item with properties
          const page = await notionApi.getPage(result.id);
          if (page.properties) {
            const properties = [];
            for (const [key, value] of Object.entries(page.properties)) {
              if (key === 'title') continue; // Already included

              let propertyValue = '';
              if (value.type === 'rich_text') {
                propertyValue = notionUtils.extractTextFromRichText(value.rich_text);
              } else if (value.type === 'select' && value.select) {
                propertyValue = value.select.name;
              } else if (value.type === 'multi_select') {
                propertyValue = value.multi_select.map(item => item.name).join(', ');
              } else if (value.type === 'date' && value.date) {
                propertyValue = value.date.start;
                if (value.date.end) {
                  propertyValue += ` to ${value.date.end}`;
                }
              } else if (value.type === 'checkbox') {
                propertyValue = value.checkbox ? 'Yes' : 'No';
              } else if (value.type === 'url') {
                propertyValue = value.url || '';
              } else if (value.type === 'email') {
                propertyValue = value.email || '';
              } else if (value.type === 'phone_number') {
                propertyValue = value.phone_number || '';
              }

              if (propertyValue) {
                properties.push(`${key}: ${propertyValue}`);
              }
            }

            if (properties.length > 0) {
              contentData.properties = properties.join('\n');
              contentData.content += '\n\n' + contentData.properties;
            }
          }
        }
      } else if (result.type === 'database') {
        // Get database structure
        const database = await notionApi.getDatabase(result.id);

        // Get some items from the database
        const queryResponse = await notionApi.queryDatabase(result.id, {}, [
          {
            timestamp: 'created_time',
            direction: 'descending'
          }
        ]);

        const items = notionUtils.formatDatabaseItems(queryResponse);
        contentData.database = {
          properties: database.properties ? Object.keys(database.properties) : [],
          items: items.slice(0, 5) // Limit to 5 items
        };

        // Format database info as text
        contentData.content = `Database: ${result.title}\n\nProperties: ${contentData.database.properties.join(', ')}\n\nRecent items:\n`;

        // For each database item, also fetch its content
        const detailedItems = [];
        for (const item of items.slice(0, 3)) { // Limit to 3 items for performance
          contentData.content += `\n- ${item.title}`;

          try {
            // Get the page content for this database item
            const itemStructure = await this.traversePageContent(item.id, 0, 2); // Max depth of 2 for DB items
            const itemContent = this.extractContentFromStructure(itemStructure);

            if (itemContent) {
              detailedItems.push({
                title: item.title,
                content: itemContent
              });
              contentData.content += `\n  ${itemContent.substring(0, 200).replace(/\n/g, '\n  ')}${itemContent.length > 200 ? '...' : ''}`;
            }
          } catch (itemError) {
            console.error(`Error fetching content for database item ${item.id}:`, itemError);
          }
        }

        contentData.databaseItems = detailedItems;
      }

      return contentData;
    } catch (error) {
      console.error(`Error retrieving content for ${result.id}:`, error);
      return {
        id: result.id,
        type: result.type,
        title: result.title,
        url: result.url,
        content: 'Error retrieving content: ' + error.message
      };
    }
  }

  /**
   * Traverse page content recursively to explore the tree structure
   * @param {string} blockId - Block ID to start from (page ID or block ID)
   * @param {number} currentDepth - Current depth in the traversal
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Promise<Array>} - Structured content
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
   * @param {Array} structure - Structured content from traversePageContent
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
   * Format the final response using LLM
   * @param {string} query - Original query
   * @param {Object} contentData - Content data
   * @param {Array} relevantResults - All relevant results
   * @returns {Promise<string>} - Formatted response
   */
  async formatResponse(query, contentData, relevantResults) {
    try {
      // Prepare content for the LLM
      let content = `Title: ${contentData.title}\n\n${contentData.content}`;

      // Limit content length to avoid token limits
      if (content.length > 4000) {
        content = content.substring(0, 4000) + '... (content truncated)';
      }

      // Prepare other results
      let otherResults = '';
      if (relevantResults.length > 1) {
        otherResults = 'Other relevant pages:\n' + relevantResults.slice(1, 4).map((result, index) => {
          return `${index + 1}. ${result.title} (${result.type})`;
        }).join('\n');
      }

      const prompt = [
        {
          role: 'system',
          content: `You are an AI assistant that helps users find information in a knowledge base.
          You will be given content from a Notion page or database and a user's query.
          Your task is to create a helpful, concise response that answers the user's query based on the content.
          Include relevant information and cite the source.
          If the content doesn't fully answer the query, acknowledge that and provide what information is available.`
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nContent from Notion:\n${content}\n\n${otherResults}\n\nPlease provide a helpful response to the query based on this information.`
        }
      ];

      const response = await processMessage(prompt);
      return response.content;
    } catch (error) {
      console.error('Error formatting response:', error);

      // Fallback to a simple response
      return `I found information about "${contentData.title}" in Notion, but encountered an error formatting the response. You can view the page directly at ${contentData.url}.`;
    }
  }
}

module.exports = NotionAgent;
