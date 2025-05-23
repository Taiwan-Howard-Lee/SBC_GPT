const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Load environment variables
dotenv.config();

// Import API tests
const runAllTests = async () => {
  console.log(`${colors.magenta}Running API tests before starting server...${colors.reset}`);

  try {
    // Import and run tests
    const { runAllTests } = require('./tests/api-test-module');
    await runAllTests();
    console.log(`${colors.green}All tests passed! Starting server...${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Error running tests: ${error.message}${colors.reset}`);
    return false;
  }
};

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import auth controller with sessions
const { sessions } = require('./controllers/authController');

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;

  // Get admin password from environment variables
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  if (password === adminPassword) {
    // Generate a simple session ID
    // In a real app, you'd use a more secure method
    const sessionId = Math.random().toString(36).substring(2, 15);

    // Store session
    sessions[sessionId] = true;

    return res.json({
      success: true,
      message: 'Authentication successful',
      sessionId
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid password'
    });
  }
});

app.get('/api/auth/validate', (req, res) => {
  const sessionId = req.headers.authorization;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  return res.json({
    success: true,
    message: 'Session is valid'
  });
});

// Import routes
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
const agentRoutes = require('./routes/agents');

// Import Notion components
const notionCache = require('./integrations/notion/cache');
const adaptiveStructure = require('./integrations/notion/adaptiveStructure');
const twoStageRetrieval = require('./integrations/notion/twoStageRetrieval');

// Initialize agents system
require('./agents');

// Initialize Notion components at server startup with a delay to ensure server is fully started
setTimeout(async () => {
  console.log('Starting Notion components initialization (delayed start)...');

  try {
    // Step 1: Initialize Notion cache
    console.log('Initializing Notion cache...');
    const cacheSuccess = await notionCache.initialize();

    if (cacheSuccess) {
      console.log('✅ Notion cache initialized successfully');
    } else {
      console.log('ℹ️ Server will use direct API calls until cache is ready');
    }

    // Step 2: Initialize adaptive structure
    console.log('Initializing adaptive structure...');
    const adaptiveSuccess = await adaptiveStructure.initialize();

    if (adaptiveSuccess) {
      console.log('✅ Adaptive structure initialized successfully');
    } else {
      console.log('⚠️ Adaptive structure initialization failed');
    }

    // Step 3: Initialize two-stage retrieval
    console.log('Initializing two-stage retrieval...');
    const retrievalSuccess = await twoStageRetrieval.initialize();

    if (retrievalSuccess) {
      console.log('✅ Two-stage retrieval initialized successfully');
    } else {
      console.log('⚠️ Two-stage retrieval initialization failed');
    }

    console.log('✅ All Notion components initialized');
  } catch (error) {
    console.error('❌ Error initializing Notion components:', error);
    console.log('ℹ️ Server will continue to function using direct API calls');
  }
}, 3000); // 3 second delay

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Notion cache status endpoint
app.get('/api/notion/cache/status', (req, res) => {
  const cacheStatus = {
    initialized: notionCache.isInitialized,
    loading: notionCache.isLoading,
    lastRefreshTime: notionCache.lastRefreshTime,
    memoryUsage: notionCache.getMemoryUsage()
  };

  res.json(cacheStatus);
});

// Manually refresh Notion cache
app.post('/api/notion/cache/refresh', (req, res) => {
  if (notionCache.isLoading) {
    return res.status(409).json({
      success: false,
      message: 'Cache refresh already in progress'
    });
  }

  notionCache.refresh()
    .then(success => {
      res.json({
        success,
        message: success ? 'Cache refreshed successfully' : 'Failed to refresh cache'
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: 'Error refreshing cache',
        error: error.message
      });
    });
});

// Use routes
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/agents', agentRoutes);

// Start server with tests
const startServer = async () => {
  // Run tests first
  const testsSucceeded = await runAllTests();

  if (!testsSucceeded) {
    console.log(`${colors.red}Tests failed. Fix issues before starting the server.${colors.reset}`);
    process.exit(1);
    return;
  }

  // Start server if tests pass
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`${colors.green}Server running on port ${PORT}${colors.reset}`);
  });
};

// Start the server
startServer();

module.exports = app;
