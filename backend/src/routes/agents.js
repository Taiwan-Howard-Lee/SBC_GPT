/**
 * Agent Routes
 * 
 * API routes for interacting with agents.
 */
const express = require('express');
const { isAuthenticated } = require('../controllers/authController');
const { agentService } = require('../agents');

const router = express.Router();

// Apply authentication middleware
router.use(isAuthenticated);

/**
 * Get all available agents
 * GET /api/agents
 */
router.get('/', (req, res) => {
  try {
    const agents = agentService.getAgents();
    res.json(agents);
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving agents', 
      error: error.message 
    });
  }
});

/**
 * Process a query with the agent service
 * POST /api/agents/query
 */
router.post('/query', async (req, res) => {
  try {
    const { query, context = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required' 
      });
    }
    
    const response = await agentService.routeQuery(query, context);
    res.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing query', 
      error: error.message 
    });
  }
});

/**
 * Process a query with a specific agent
 * POST /api/agents/:id/query
 */
router.post('/:id/query', async (req, res) => {
  try {
    const { query, context = {} } = req.body;
    const agentId = req.params.id;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required' 
      });
    }
    
    // Add agent ID to context
    const agentContext = { ...context, agentId };
    
    const response = await agentService.routeQuery(query, agentContext);
    res.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing query', 
      error: error.message 
    });
  }
});

module.exports = router;
