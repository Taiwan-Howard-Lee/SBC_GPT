const feedbackRepo = require('../repositories/feedbackRepository');

/**
 * Add feedback for a chat
 */
const addFeedback = (req, res) => {
  try {
    const chatId = req.params.id;
    const { rating, comments } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const feedback = feedbackRepo.addFeedback(chatId, rating, comments || '');
    
    res.status(201).json({
      id: feedback.id,
      chatId: feedback.chatId,
      rating: feedback.rating,
      comments: feedback.comments,
      createdAt: feedback.createdAt
    });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ message: 'Error adding feedback', error: error.message });
  }
};

/**
 * Get feedback stats (for admin)
 */
const getFeedbackStats = (req, res) => {
  try {
    const stats = feedbackRepo.getFeedbackStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ message: 'Error retrieving feedback stats', error: error.message });
  }
};

/**
 * Get all feedback (for admin)
 */
const getAllFeedback = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const feedback = feedbackRepo.getAllFeedback(limit, offset);
    res.json(feedback);
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({ message: 'Error retrieving feedback', error: error.message });
  }
};

module.exports = {
  addFeedback,
  getFeedbackStats,
  getAllFeedback
};
