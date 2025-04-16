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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Use routes
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
