const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

// Import Notion cache
const notionCache = require('./integrations/notion/cache');

// Initialize agents system
require('./agents');

// Initialize Notion cache at server startup with a delay to ensure server is fully started
setTimeout(() => {
  console.log('Starting Notion cache initialization (delayed start)...');
  notionCache.initialize()
    .then(success => {
      if (success) {
        console.log('✅ Notion cache initialized successfully at server startup');
      } else {
        console.log('ℹ️ Server will use direct API calls until cache is ready');
      }
    })
    .catch(error => {
      console.error('❌ Error initializing Notion cache at server startup:', error);
      console.log('ℹ️ Server will continue to function using direct API calls');
    });
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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
