const db = require('../database/db');

// Admin login
const adminLogin = (req, res) => {
  const { password } = req.body;
  
  // In a real app, you'd use environment variables and secure comparison
  if (password === 'admin123') {
    // In a real app, you'd use a more secure token generation method
    const token = Math.random().toString(36).substring(2, 15);
    
    res.json({
      success: true,
      message: 'Admin login successful',
      token
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid admin password'
    });
  }
};

// Get active chats
const getActiveChats = (req, res) => {
  try {
    const chats = db.prepare(`
      SELECT c.id, c.title, c.created_at as createdAt, c.updated_at as updatedAt,
             COUNT(m.id) as messageCount
      FROM chats c
      LEFT JOIN messages m ON c.id = m.chat_id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `).all();
    
    res.json(chats);
  } catch (error) {
    console.error('Error getting active chats:', error);
    res.status(500).json({ message: 'Error retrieving active chats', error: error.message });
  }
};

// Get deleted chats with feedback
const getDeletedChats = (req, res) => {
  try {
    const chats = db.prepare(`
      SELECT f.id as feedback_id, f.chat_id as chatId, f.rating, f.comments,
             f.created_at as createdAt, c.title
      FROM feedback f
      LEFT JOIN chats c ON f.chat_id = c.id
      ORDER BY f.created_at DESC
    `).all();
    
    res.json(chats);
  } catch (error) {
    console.error('Error getting deleted chats:', error);
    res.status(500).json({ message: 'Error retrieving deleted chats', error: error.message });
  }
};

// Get chat insights
const getChatInsights = (req, res) => {
  try {
    // Get basic stats
    const totalChats = db.prepare('SELECT COUNT(*) as count FROM chats').get().count;
    const deletedChats = db.prepare('SELECT COUNT(*) as count FROM feedback').get().count;
    const activeChats = totalChats - deletedChats;
    
    // Get rating stats
    const ratingStats = db.prepare(`
      SELECT AVG(rating) as average_rating,
             COUNT(*) as total_feedback,
             SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
             SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
             SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
             SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
             SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
      FROM feedback
    `).get();
    
    // Get recent feedback
    const recentFeedback = db.prepare(`
      SELECT id, chat_id as chatId, rating, comments, created_at as createdAt
      FROM feedback
      ORDER BY created_at DESC
      LIMIT 5
    `).all();
    
    // Prepare response
    const insights = {
      totalChats,
      activeChats,
      deletedChats,
      averageRating: ratingStats.average_rating || 0,
      totalFeedback: ratingStats.total_feedback || 0,
      feedbackRate: totalChats > 0 ? (ratingStats.total_feedback / totalChats) * 100 : 0,
      ratingDistribution: {
        1: ratingStats.rating_1 || 0,
        2: ratingStats.rating_2 || 0,
        3: ratingStats.rating_3 || 0,
        4: ratingStats.rating_4 || 0,
        5: ratingStats.rating_5 || 0
      },
      recentFeedback
    };
    
    res.json(insights);
  } catch (error) {
    console.error('Error getting chat insights:', error);
    res.status(500).json({ message: 'Error retrieving chat insights', error: error.message });
  }
};

module.exports = {
  adminLogin,
  getActiveChats,
  getDeletedChats,
  getChatInsights
};
