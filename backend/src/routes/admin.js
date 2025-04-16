const express = require('express');
const { isAuthenticated } = require('../controllers/authController');
const { 
  adminLogin,
  getActiveChats, 
  getDeletedChats, 
  getChatInsights 
} = require('../controllers/adminController');

const router = express.Router();

// Admin login (no auth required)
router.post('/login', adminLogin);

// Admin middleware to check admin token
const isAdmin = (req, res, next) => {
  const adminToken = req.headers.authorization;
  
  // In a real app, you'd validate the token against a stored value
  if (adminToken) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// Protected admin routes
router.use(isAdmin);

// Admin routes
router.get('/chats/active', getActiveChats);
router.get('/chats/deleted', getDeletedChats);
router.get('/insights', getChatInsights);

module.exports = router;
