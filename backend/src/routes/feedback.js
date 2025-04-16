const express = require('express');
const { isAuthenticated } = require('../controllers/authController');
const { 
  addFeedback, 
  getFeedbackStats, 
  getAllFeedback 
} = require('../controllers/feedbackController');

const router = express.Router();

// Apply authentication middleware
router.use(isAuthenticated);

// Feedback routes
router.post('/chats/:id', addFeedback);

// Admin routes (we'll check for admin role in the controller)
router.get('/stats', getFeedbackStats);
router.get('/all', getAllFeedback);

module.exports = router;
