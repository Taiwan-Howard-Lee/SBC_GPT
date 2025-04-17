/**
 * Agent Service
 *
 * This service acts as a central router for agent-based queries.
 * It determines which agent should handle a query and routes accordingly.
 */

// Import the Gemini service for LLM-based decisions
const { processMessage } = require('./geminiService');

class AgentService {
  constructor() {
    this.agents = new Map();
  }

  /**
   * Register an agent with the service
   * @param {BaseAgent} agent - The agent to register
   */
  registerAgent(agent) {
    if (!agent || !agent.id) {
      console.error('Cannot register agent: Invalid agent or missing ID');
      return;
    }

    this.agents.set(agent.id, agent);
    console.log(`Agent registered: ${agent.name} (${agent.id})`);
  }

  /**
   * Get all registered agents
   * @returns {Array} - Array of agent info objects
   */
  getAgents() {
    return Array.from(this.agents.values()).map(agent => agent.getInfo());
  }

  /**
   * Route a query to the appropriate agent
   * @param {string} query - The user's query
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - The response from the agent
   */
  async routeQuery(query, context = {}) {
    try {
      // If specific agent is requested, use it directly
      if (context.agentId && this.agents.has(context.agentId)) {
        const agent = this.agents.get(context.agentId);
        if (agent.isActive) {
          return await agent.processQuery(query, context);
        } else {
          return {
            success: false,
            message: `Agent ${agent.name} is not active`
          };
        }
      }

      // Find the best agent for this query
      const bestAgent = await this.findBestAgent(query, context);

      if (!bestAgent) {
        return {
          success: false,
          message: "I couldn't find an agent to handle your query."
        };
      }

      // Process the query with the selected agent
      return await bestAgent.processQuery(query, context);
    } catch (error) {
      console.error('Error routing query:', error);
      return {
        success: false,
        message: `Error processing your query: ${error.message}`
      };
    }
  }

  /**
   * Find the best agent to handle a query
   * @param {string} query - The user's query
   * @param {Object} context - Additional context
   * @returns {Promise<BaseAgent|null>} - The best agent or null if none found
   */
  async findBestAgent(query, context = {}) {
    // Get all active agents
    const activeAgents = Array.from(this.agents.values()).filter(agent => agent.isActive);

    if (activeAgents.length === 0) {
      return null;
    }

    // First, check if we have a Notion agent
    const notionAgent = activeAgents.find(agent => agent.id === 'notion');

    // If we don't have a Notion agent, return null
    if (!notionAgent) {
      return null;
    }

    // Simple check: if the query contains 'notion', use the Notion agent
    const queryLower = query.toLowerCase();
    if (queryLower.includes('notion') ||
        queryLower.includes('wiki') ||
        queryLower.includes('knowledge base') ||
        queryLower.includes('documentation')) {
      console.log(`Query contains Notion-related keywords: "${query}"`);
      return notionAgent;
    }

    // Check for information-seeking patterns
    const infoPatterns = [
      'find', 'search', 'look up', 'tell me about', 'what is',
      'how to', 'where can i', 'information on', 'details about'
    ];

    if (infoPatterns.some(pattern => queryLower.includes(pattern))) {
      console.log(`Query contains information-seeking patterns: "${query}"`);
      return notionAgent;
    }

    // If we're still here, try using the LLM as a last resort
    try {
      const prompt = [
        {
          role: 'system',
          content: `You are a classifier that determines if a query is related to retrieving information from a knowledge base.
          Answer with ONLY a single word: either "YES" or "NO".

          Answer YES if the query is asking for information, facts, or knowledge that would be stored in a documentation system.
          Answer NO for conversational queries, greetings, or questions not related to retrieving information.`
        },
        {
          role: 'user',
          content: `Is this query asking for information that would be in a knowledge base? "${query}"
          Answer with ONLY YES or NO.`
        }
      ];

      const response = await processMessage(prompt);
      const answer = response.content.trim().toUpperCase();
      console.log(`LLM classification for "${query}": ${answer}`);

      if (answer.includes('YES')) {
        console.log(`LLM determined query is information-seeking: "${query}"`);
        return notionAgent;
      } else {
        console.log(`LLM determined query is not information-seeking: "${query}"`);
        return null;
      }
    } catch (error) {
      console.error('Error using LLM to classify query:', error);
      return null;
    }
  }
}

// Create a singleton instance
const agentService = new AgentService();

module.exports = agentService;
