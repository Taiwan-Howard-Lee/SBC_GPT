/**
 * Notion Agent
 *
 * This agent handles queries related to Notion content.
 * It uses a structured approach to search and retrieve information,
 * with a two-stage retrieval process for better user experience.
 */
const BaseAgent = require('./baseAgent');
const notionApi = require('../integrations/notion/api');
const notionUtils = require('../integrations/notion/utils');
const notionCache = require('../integrations/notion/cache');
const adaptiveStructure = require('../integrations/notion/adaptiveStructure');
const twoStageRetrieval = require('../integrations/notion/twoStageRetrieval');
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
      ? process.env.NOTION_DATABASE_IDS.split(',').filter(id => id.trim() !== '')
      : [];

    if (this.databaseIds.length === 0) {
      console.log('No Notion database IDs configured. Will search all accessible content.');
    }

    // Initialize the Notion components
    this.initializeComponents();

    // Flag to track if we're in two-stage mode
    this.twoStageMode = false;
    this.pendingSources = [];
  }

  /**
   * Initialize the Notion components
   */
  async initializeComponents() {
    if (this.isConfigured) {
      try {
        // Initialize the cache if needed
        if (!notionCache.isInitialized && !notionCache.isLoading) {
          console.log('Notion cache will be initialized by the server.');
        }

        // Initialize the adaptive structure
        if (!adaptiveStructure.initialized) {
          console.log('Initializing adaptive structure...');
          await adaptiveStructure.initialize();
        }

        // Initialize the two-stage retrieval
        if (!twoStageRetrieval.initialized) {
          console.log('Initializing two-stage retrieval...');
          await twoStageRetrieval.initialize();
        }

        console.log('Notion agent components initialized successfully.');
      } catch (error) {
        console.error('Error initializing Notion components:', error);
      }
    }
  }

  /**
   * Check if this agent can handle a specific query
   * @param {string} query - The query from the central router
   * @returns {Promise<boolean>} - Whether this agent can handle the query
   */
  async canHandle(query) {
    if (!this.isConfigured || !this.isActive) {
      return false;
    }

    // If we're in two-stage mode and this is a follow-up query for details,
    // we should definitely handle it
    if (this.twoStageMode) {
      // Check if this is a request for details about a specific source
      if (query.startsWith('get_details:') ||
          query.toLowerCase().includes('tell me more about source') ||
          query.toLowerCase().includes('more details about') ||
          query.toLowerCase().includes('more information on')) {
        return true;
      }

      // Check if any of our pending sources are mentioned
      for (const source of this.pendingSources) {
        if (query.toLowerCase().includes(source.title.toLowerCase())) {
          return true;
        }
      }
    }

    // This agent can handle queries related to Notion content
    // We'll use a simple keyword check for now
    const notionKeywords = ['notion', 'document', 'page', 'database', 'knowledge base', 'kb', 'wiki', 'information', 'docs'];
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
   * @returns {Promise<Object>} - The agent's response
   */
  async processQuery(query) {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Notion agent is not configured. Please set NOTION_API_KEY in .env'
      };
    }

    try {
      console.log(`Notion agent processing query: "${query}"`);

      // Check if we're in two-stage mode and this is a follow-up query
      if (this.twoStageMode) {
        let sourceId = null;

        // Check for explicit get_details command
        if (query.startsWith('get_details:')) {
          sourceId = query.replace('get_details:', '').trim();
        }
        // Check for natural language requests for more details
        else if (query.toLowerCase().includes('tell me more about source') ||
                 query.toLowerCase().includes('more details about') ||
                 query.toLowerCase().includes('more information on')) {

          // Try to extract a source number (e.g., "Tell me more about Source 1")
          const sourceNumberMatch = query.match(/source\s+(\d+)/i) ||
                                   query.match(/(\d+)/);

          if (sourceNumberMatch) {
            const sourceIndex = parseInt(sourceNumberMatch[1], 10) - 1;
            if (sourceIndex >= 0 && sourceIndex < this.pendingSources.length) {
              sourceId = this.pendingSources[sourceIndex].id;
            }
          } else {
            // Try to match by title
            for (const source of this.pendingSources) {
              if (query.toLowerCase().includes(source.title.toLowerCase())) {
                sourceId = source.id;
                break;
              }
            }
          }
        }

        // Find the source in our pending sources
        const source = this.pendingSources.find(s => s.id === sourceId);

        if (!source) {
          return {
            success: false,
            message: `I couldn't find the requested information. Please try asking your question again.`
          };
        }

        // Get detailed content for this source
        console.log(`Getting detailed content for source: ${source.title} (${sourceId})`);
        const detailedContent = await twoStageRetrieval.getDetailedContent(sourceId, query);

        // Format the response
        const response = await this.formatDetailedResponse(detailedContent);

        // Reset two-stage mode
        this.twoStageMode = false;
        this.pendingSources = [];

        return {
          success: true,
          message: response,
          data: {
            content: detailedContent,
            usedFullContent: true
          }
        };
      }

      // Normal query processing (first stage)
      // Step 1: Use LLM to extract search terms from the query
      const searchTerms = await this.extractSearchTerms(query);
      console.log(`Extracted search terms: "${searchTerms}"`);

      // Step 2: Make sure two-stage retrieval is initialized
      if (!twoStageRetrieval.initialized) {
        console.log('Two-stage retrieval not initialized, initializing now...');
        await twoStageRetrieval.initialize();
      }

      // Find potential sources using two-stage retrieval
      const potentialSources = await twoStageRetrieval.findPotentialSources(query);
      console.log(`Found ${potentialSources.length} potential sources`);

      if (potentialSources.length === 0) {
        console.log(`No potential sources found for query: "${query}"`);
        return {
          success: false,
          message: `I couldn't find any information about "${searchTerms}" in our knowledge base.`,
          data: {
            searchTerms,
            query
          }
        };
      }

      // Save the potential sources for the second stage
      this.twoStageMode = true;
      this.pendingSources = potentialSources;

      // Format the initial response with potential sources
      const response = await this.formatInitialResponse(query, potentialSources);

      return {
        success: true,
        message: response,
        data: {
          potentialSources,
          twoStageMode: true
        }
      };
    } catch (error) {
      console.error('Error in Notion agent:', error);

      // Reset two-stage mode on error
      this.twoStageMode = false;
      this.pendingSources = [];

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
   * @returns {Promise<Object>} - Content data
   */
  async retrieveContent(result) {
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
        const blocks = await twoStageRetrieval.getPageBlocksRecursively(result.id, 3);
        contentData.content = twoStageRetrieval.extractTextFromBlocks(blocks);

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
            const blocks = await twoStageRetrieval.getPageBlocksRecursively(item.id, 3);
            const itemContent = twoStageRetrieval.extractTextFromBlocks(blocks);

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
   * Format the initial response with potential sources
   * @param {string} query - Original query
   * @param {Array} potentialSources - Potential sources
   * @returns {Promise<string>} - Formatted response
   */
  async formatInitialResponse(query, potentialSources) {
    try {
      // Prepare sources for the LLM
      const formattedSources = potentialSources.map((source, index) => {
        return `${index + 1}. ${source.title} (${source.path})\n   Preview: ${source.preview}`;
      }).join('\n\n');

      const prompt = [
        {
          role: 'system',
          content: `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

          IDENTITY:
          - You ARE an employee of SBC Australia
          - You are speaking as a representative of SBC Australia
          - You should use "we", "our", and "us" when referring to SBC Australia
          - You have been with the company for several years and are knowledgeable about its operations
          - You are proud to be part of the SBC Australia team

          YOUR TASK:
          You will be given a user query and a list of potential information sources from our knowledge base.
          Your task is to present these sources to the user in a helpful way, explaining that they can ask for more details about any specific source.

          FORMAT YOUR RESPONSE AS FOLLOWS:
          1. Brief introduction acknowledging the query
          2. Present the potential sources with their previews
          3. Ask if the user would like more detailed information about any specific source

          IMPORTANT INSTRUCTIONS:
          - For each source, include a command the user can type to get more details
          - The command should be in the format: "Tell me more about Source X" or similar
          - Make it clear that the user needs to specify which source they want details about
          - Be professional, helpful, and concise
          - Do NOT make up information - stick to what's in the previews
          - Do NOT claim to have detailed information yet - you're just showing potential sources`
        },
        {
          role: 'user',
          content: `Query: "${query}"

Potential sources:
${formattedSources}

Please format a helpful response that presents these sources and explains how the user can get more detailed information.`
        }
      ];

      const response = await processMessage(prompt);
      return response.content;
    } catch (error) {
      console.error('Error formatting initial response:', error);

      // Fallback to a simple response
      const sourcesList = potentialSources.map((source, index) =>
        `${index + 1}. ${source.title}`
      ).join('\n');

      return `I found some information that might help answer your question. Here are some potential sources:\n\n${sourcesList}\n\nLet me know which one you'd like to explore in more detail.`;
    }
  }

  /**
   * Format the detailed response for a specific source
   * @param {Object} detailedContent - Detailed content
   * @returns {Promise<string>} - Formatted response
   */
  async formatDetailedResponse(detailedContent) {
    try {
      // Prepare content for the LLM
      let content = `Title: ${detailedContent.title}\nPath: ${detailedContent.path}\nType: ${detailedContent.documentType}\n\n${detailedContent.content}`;

      // Limit content length to avoid token limits
      if (content.length > 4000) {
        content = content.substring(0, 4000) + '... (content truncated)';
      }

      // Prepare related pages
      let relatedPages = '';
      if (detailedContent.relatedPages && detailedContent.relatedPages.length > 0) {
        relatedPages = 'Related pages:\n' + detailedContent.relatedPages.map((page, index) => {
          return `${index + 1}. ${page.title}`;
        }).join('\n');
      }

      const detailedPrompt = [
        {
          role: 'system',
          content: `You are a professional, efficient executive assistant named SBC Assistant working at SBC Australia, a global leading startup accelerator.

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

           You will be given content from a document and related information.
           Extract the relevant information that directly answers the user's query.`
        },
        {
          role: 'user',
          content: `Content: ${content}\n\n${relatedPages}\n\nProvide a professional, clear response based on this information. Be concise while ensuring the information is complete and accurate. Focus on delivering the most relevant information in a straightforward manner.`
        }
      ];

      const response = await processMessage(detailedPrompt);
      return response.content;
    } catch (error) {
      console.error('Error formatting detailed response:', error);

      // Fallback to a simple response
      return `I found detailed information about "${detailedContent.title}", but encountered an error formatting the response. You can view the page directly at ${detailedContent.url}.`;
    }
  }
}

// Export the NotionAgent class
module.exports = NotionAgent;
