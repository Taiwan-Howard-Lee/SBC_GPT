// Simple in-memory session storage from server.js
const sessions = {};

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  const sessionId = req.headers.authorization;
  
  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  
  next();
};

module.exports = {
  isAuthenticated,
  sessions
};
