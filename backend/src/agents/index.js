/**
 * Agents System
 * 
 * This module initializes and exports all available agents.
 */
const NotionAgent = require('./notionAgent');
const agentService = require('../services/agentService');

// Initialize agents
const notionAgent = new NotionAgent();

// Register agents with the agent service
agentService.registerAgent(notionAgent);

// Export agents and service
module.exports = {
  agentService,
  agents: {
    notion: notionAgent
  }
};
