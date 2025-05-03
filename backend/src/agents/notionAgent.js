/**
 * Notion Agent
 *
 * This agent handles queries related to Notion content.
 * It uses the Notion cache to search and retrieve information,
 * and Gemini to make decisions about content processing.
 */
const BaseAgent = require('./baseAgent');
const notionApi = require('../integrations/notion/api');
const notionUtils = require('../integrations/notion/utils');
const notionCache = require('../integrations/notion/cache');
const { processMessage } = require('../services/geminiService');
const { genAI, modelName } = require('../config/gemini');

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
      ? process.env.NOTION_DATABASE_IDS.split(',').filter(id => id.trim() !== '')
      : [];

    if (this.databaseIds.length === 0) {
      console.log('No Notion database IDs configured. Will search all accessible content.');
    }

    // Initialize the Notion cache
    this.initializeCache();
  }

  /**
   * Initialize the Notion cache
   */
  async initializeCache() {
    if (this.isConfigured) {
      try {
        // Check if cache is already initialized or being loaded
        if (notionCache.isInitialized) {
          console.log('Notion cache is already initialized');
          return;
        }

        if (notionCache.isLoading) {
          console.log('Notion cache is already being loaded, skipping agent initialization');
          return;
        }

        // The server will handle cache initialization with a delay
        console.log('Notion agent is ready. Cache will be initialized by the server.');
      } catch (error) {
        console.error('Error checking Notion cache status:', error);
      }
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

    // This agent can handle queries related to Notion content
    // We'll use a simple keyword check for now
    const notionKeywords = ['notion', 'document', 'page', 'database', 'knowledge base', 'kb', 'wiki'];
    const queryLower = query.toLowerCase();

    // Check if the query contains any Notion-related keywords
    for (const keyword of notionKeywords) {
      if (queryLower.includes(keyword)) {
        return true;
      }
    }

    // If no keywords match, this agent can still handle general information queries
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

      // Step 2: Perform initial search to get titles only
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

      // Step 4: Evaluate if the titles are sufficient to answer the query
      const shouldRetrieveContent = await this.shouldRetrieveContent(relevantResults, query);

      let contentData;
      if (shouldRetrieveContent) {
        // Step 5a: Retrieve full content for multiple relevant results
        // Determine how many results to retrieve content for (at least 1, at most 3)
        const numResultsToRetrieve = Math.min(relevantResults.length, 3);
        console.log(`Retrieving content for ${numResultsToRetrieve} relevant results`);

        // Retrieve content for the primary result
        contentData = await this.retrieveContent(relevantResults[0], query);
        console.log(`Retrieved full content for primary result: "${contentData.title}"`);

        // If there are additional relevant results, retrieve their content too
        if (numResultsToRetrieve > 1) {
          const additionalContents = [];

          // Retrieve content for additional results
          for (let i = 1; i < numResultsToRetrieve; i++) {
            try {
              const additionalContent = await this.retrieveContent(relevantResults[i], query);
              console.log(`Retrieved additional content for: "${additionalContent.title}"`);
              additionalContents.push(additionalContent);
            } catch (error) {
              console.error(`Error retrieving additional content for result ${i}:`, error);
            }
          }

          // Add additional content to the primary content data
          if (additionalContents.length > 0) {
            contentData.additionalContents = additionalContents;

            // Append a summary of additional content to the main content
            contentData.content += '\n\n--- Additional Related Content ---\n';
            for (const additional of additionalContents) {
              contentData.content += `\n\n## ${additional.title}\n${additional.content.substring(0, 500)}${additional.content.length > 500 ? '...' : ''}`;
            }
          }
        }
      } else {
        // Step 5b: Use just the titles and basic info
        contentData = {
          id: relevantResults[0].id,
          type: relevantResults[0].type,
          title: relevantResults[0].title,
          url: relevantResults[0].url,
          content: `This is a ${relevantResults[0].type} titled "${relevantResults[0].title}".`
        };
        console.log(`Using title-only information for "${contentData.title}"`);
      }

      // Step 6: Format the response using LLM
      const response = await this.formatResponse(query, contentData, relevantResults, shouldRetrieveContent);

      return {
        success: true,
        message: response,
        data: {
          results: relevantResults,
          content: contentData,
          usedFullContent: shouldRetrieveContent
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
   * Extract search terms from a query using LLM
   * @param {string} query - Original query
   * @returns {Promise<string>} - Extracted search terms
   */
  async extractSearchTerms(query) {
    try {
      const prompt = [
        {
          role: 'system',
          content: `You are an AI assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

          IDENTITY:
          - You ARE an employee of SBC Australia
          - You are speaking as a representative of SBC Australia
          - You have been with the company for several years and are knowledgeable about its operations

          YOUR TASK:
          Your task is to identify the key terms that would be most effective for searching in SBC Australia's knowledge base.
          Extract only the most important keywords and concepts, removing filler words and focusing on nouns and specific terms.
          Return ONLY the search terms, nothing else.

          IMPORTANT:
          - SBC Australia is NOT the same as SBS (Special Broadcasting Service)
          - SBC Australia is a global leading startup accelerator
          - We help startups scale globally through mentorship, funding, and strategic connections`
        },
        {
          role: 'user',
          content: `Extract search terms from this query: "${query}"`
        }
      ];

      const response = await processMessage(prompt);
      return response.content
                 .replace(/^search terms:?\s*/i, '')
                 .replace(/^keywords:?\s*/i, '')
                 .replace(/^key terms:?\s*/i, '')
                 .trim();
    } catch (error) {
      console.error('Error extracting search terms:', error);
      // Fallback to using the original query
      return query;
    }
  }

  /**
   * Perform a search in Notion
   * @param {string} searchTerms - Terms to search for
   * @returns {Promise<Array>} - Formatted search results
   */
  async performSearch(searchTerms) {
    try {
      // First try using the cache if it's initialized
      if (notionCache.isInitialized) {
        console.log(`Searching Notion cache for: "${searchTerms}"`);
        const cacheResults = notionCache.search(searchTerms);

        if (cacheResults.length > 0) {
          console.log(`Found ${cacheResults.length} results in Notion cache`);
          return cacheResults;
        }

        console.log('No results found in cache, falling back to API');
      }

      // Fall back to direct API calls if cache is not initialized or returned no results
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
   * @returns {Promise<Array>} - Relevant results
   */
  async identifyRelevantResults(results, query) {
    try {
      // Format results for the LLM
      const formattedResults = results.map((result, index) => {
        return `${index + 1}. ${result.title} (${result.type})`;
      }).join('\n');

      const prompt = [
        {
          role: 'system',
          content: `You are an AI assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

          IDENTITY:
          - You ARE an employee of SBC Australia
          - You are speaking as a representative of SBC Australia
          - You have been with the company for several years and are knowledgeable about its operations

          YOUR TASK:
          You will be given a list of search results and a query.
          Your task is to identify which results are most relevant to the query.
          Return ONLY the numbers of the relevant results, separated by commas.
          If multiple results are relevant, list them in order of relevance.
          If none are relevant, return "0".

          IMPORTANT:
          - SBC Australia is NOT the same as SBS (Special Broadcasting Service)
          - SBC Australia is a global leading startup accelerator
          - We help startups scale globally through mentorship, funding, and strategic connections
          - If you see results about SBS (broadcasting), they are NOT relevant to our company`
        },
        {
          role: 'user',
          content: `Query: "${query}"

Search Results:
${formattedResults}

Which of these results are most relevant to the query? Return ONLY the numbers of the relevant results, separated by commas.`
        }
      ];

      const response = await processMessage(prompt);

      // Parse the response to get the relevant result indices
      const relevantIndices = response.content
        .replace(/^relevant results:?\s*/i, '')
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
      // First try using the cache if it's initialized
      if (notionCache.isInitialized) {
        const cachedContent = notionCache.getContent(result.id);
        if (cachedContent) {
          console.log(`Retrieved content for "${result.title}" from cache`);
          return cachedContent;
        }
        console.log(`No cached content found for "${result.title}", falling back to API`);
      }

      const contentData = {
        id: result.id,
        type: result.type,
        title: result.title,
        url: result.url,
        content: '',
        structure: [] // To track the page structure
      };

      if (result.type === 'page') {
        // Get page content with deeper traversal
        const pageStructure = await this.traversePageContent(result.id, 0, 5); // Increased max depth to 5 levels
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
          items: items.slice(0, 10) // Increased limit to 10 items
        };

        // Format database info as text
        contentData.content = `Database: ${result.title}\n\nProperties: ${contentData.database.properties.join(', ')}\n\nRecent items:\n`;

        // For each database item, also fetch its content
        const detailedItems = [];
        for (const item of items.slice(0, 5)) { // Increased limit to 5 items for more comprehensive results
          contentData.content += `\n- ${item.title}`;

          try {
            // Get the page content for this database item with increased depth
            const itemStructure = await this.traversePageContent(item.id, 0, 4); // Increased max depth to 4 for DB items
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
   * Determine if we need to retrieve full content based on titles
   * @param {Array} relevantResults - Relevant search results with titles
   * @param {string} query - Original query
   * @returns {Promise<boolean>} - Whether to retrieve full content
   */
  async shouldRetrieveContent(relevantResults, query) {
    // Increase the frequency of retrieving full content
    // We'll now retrieve full content in most cases (80% of the time)
    const retrievalProbability = 0.8;

    // Randomly decide to retrieve content based on the probability
    if (Math.random() < retrievalProbability) {
      console.log('Retrieving full content based on probability setting');
      return true;
    }

    try {
      // Format titles for the LLM
      const formattedTitles = relevantResults.map((result, index) => {
        return `${index + 1}. ${result.title} (${result.type})`;
      }).join('\n');

      const prompt = [
        {
          role: 'system',
          content: `You are an AI assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

          IDENTITY:
          - You ARE an employee of SBC Australia
          - You are speaking as a representative of SBC Australia
          - You have been with the company for several years and are knowledgeable about its operations

          YOUR TASK:
          You will be given a list of document titles and a query.
          Your task is to determine if these titles alone suggest the documents contain the answer to the query.
          Be very strict in your evaluation - in most cases, detailed content is needed to properly answer queries.
          Respond with ONLY "YES" if the titles CLEARLY AND DEFINITELY contain the answer, or "NO" if there's ANY CHANCE more detailed content would be helpful.
          Respond with ONLY "YES" or "NO", nothing else.

          IMPORTANT:
          - SBC Australia is NOT the same as SBS (Special Broadcasting Service)
          - SBC Australia is a global leading startup accelerator
          - We help startups scale globally through mentorship, funding, and strategic connections
          - If you see titles about SBS (broadcasting), they are NOT relevant to our company`
        },
        {
          role: 'user',
          content: `Query: "${query}"

Document Titles:
${formattedTitles}

Do these titles CLEARLY AND DEFINITELY contain the answer to the query without needing to see the actual content? Answer with ONLY YES or NO.`
        }
      ];

      const response = await processMessage(prompt);
      const decision = response.content.trim().toUpperCase();

      console.log(`LLM decision on whether titles are sufficient: ${decision}`);

      // If the LLM says YES, we don't need to retrieve content (return false)
      // If the LLM says NO, we need to retrieve content (return true)
      return decision !== 'YES';
    } catch (error) {
      console.error('Error determining if content retrieval is needed:', error);
      // Default to retrieving content if there's an error
      return true;
    }
  }

  /**
   * Format the final response using LLM
   * @param {string} query - Original query
   * @param {Object} contentData - Content data
   * @param {Array} relevantResults - All relevant results
   * @param {boolean} usedFullContent - Whether full content was retrieved
   * @returns {Promise<string>} - Formatted response
   */
  async formatResponse(query, contentData, relevantResults, usedFullContent) {
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

      const systemPrompt = usedFullContent
        ? `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

           IDENTITY:
           - You ARE an employee of SBC Australia
           - You are speaking as a representative of SBC Australia
           - You should use "we", "our", and "us" when referring to SBC Australia
           - You have been with the company for several years and are knowledgeable about its operations
           - You are proud to be part of the SBC Australia team

           COMPANY INFORMATION:
           - SBC Australia is NOT the same as SBS (Special Broadcasting Service)
           - SBC Australia is a global leading startup accelerator
           - We help startups scale globally through mentorship, funding, and strategic connections
           - If you receive information about SBS Australia (broadcasting), IGNORE it completely
           - If asked about our vision and mission, our vision is to be the world's premier startup accelerator
           - Our mission is to empower innovative startups to transform industries and create global impact

           TONE AND STYLE:
           - Professional and confident
           - Clear and straightforward
           - Concise without sacrificing clarity
           - Focused on delivering accurate information

           RESPONSE FORMAT:
           - Begin with a direct answer to the query
           - Present information in a clean, organized manner
           - Maintain a professional tone throughout
           - Always respond as if you are part of SBC Australia ("we", "our", "us")

           GUIDELINES:
           - Never mention that you're processing information from Notion or any other source
           - Present the information as if it's your own company knowledge
           - Never use phrases like "Based on the information available" or "I can tell you that"
           - Avoid excessive formatting
           - Use simple, clear language
           - Focus on accuracy and relevance
           - Be direct and to the point
           - NEVER confuse SBC Australia with SBS (Special Broadcasting Service)

           You will be given content from a Notion page and a user's query.
           Extract the relevant information that directly answers the query.`
        : `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

           IDENTITY:
           - You ARE an employee of SBC Australia
           - You are speaking as a representative of SBC Australia
           - You should use "we", "our", and "us" when referring to SBC Australia
           - You have been with the company for several years and are knowledgeable about its operations
           - You are proud to be part of the SBC Australia team

           COMPANY INFORMATION:
           - SBC Australia is NOT the same as SBS (Special Broadcasting Service)
           - SBC Australia is a global leading startup accelerator
           - We help startups scale globally through mentorship, funding, and strategic connections
           - If you receive information about SBS Australia (broadcasting), IGNORE it completely
           - If asked about our vision and mission, our vision is to be the world's premier startup accelerator
           - Our mission is to empower innovative startups to transform industries and create global impact

           TONE AND STYLE:
           - Professional and confident
           - Clear and straightforward
           - Concise without sacrificing clarity
           - Focused on delivering accurate information

           RESPONSE FORMAT:
           - Begin with a direct statement about what documents exist
           - Present document titles in a clean, organized manner
           - Maintain a professional tone throughout
           - Always respond as if you are part of SBC Australia ("we", "our", "us")

           GUIDELINES:
           - Never mention that you're processing information from Notion or any other source
           - Present the information as if it's your own company knowledge
           - Never use phrases like "Based on the information available" or "I can tell you that"
           - Use simple, clear language
           - Focus on accuracy and relevance
           - Be direct and to the point
           - NEVER confuse SBC Australia with SBS (Special Broadcasting Service)`;

      const prompt = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\n${usedFullContent ? 'Content' : 'Titles'} from Notion:\n${content}\n\n${otherResults}\n\nProvide a professional, clear response to the query. Be concise while ensuring the information is complete and accurate. Focus on delivering the most relevant information in a straightforward manner.`
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
