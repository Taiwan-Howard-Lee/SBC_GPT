/**
 * Base Agent Interface
 * 
 * This provides a minimal interface that all agents must implement.
 * It's intentionally lightweight to allow for flexibility in implementation.
 */
class BaseAgent {
  /**
   * Constructor for the base agent
   * @param {string} id - Unique identifier for the agent
   * @param {string} name - Human-readable name
   * @param {Object} config - Configuration options
   */
  constructor(id, name, config = {}) {
    this.id = id;
    this.name = name;
    this.config = config;
    this.isActive = true;
  }

  /**
   * Check if this agent can handle a specific query
   * @param {string} query - The user's query
   * @param {Object} context - Additional context
   * @returns {Promise<boolean>} - Whether this agent can handle the query
   */
  async canHandle(query, context = {}) {
    throw new Error('Method canHandle() must be implemented by subclasses');
  }

  /**
   * Process a query and return a response
   * @param {string} query - The user's query
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - The agent's response
   */
  async processQuery(query, context = {}) {
    throw new Error('Method processQuery() must be implemented by subclasses');
  }

  /**
   * Get information about this agent
   * @returns {Object} - Agent information
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      isActive: this.isActive
    };
  }
}

module.exports = BaseAgent;
