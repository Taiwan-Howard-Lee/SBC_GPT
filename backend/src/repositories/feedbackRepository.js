const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * Add feedback for a chat
 */
const addFeedback = (chatId, rating, comments = '') => {
  const feedbackId = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(
    'INSERT INTO feedback (id, chat_id, rating, comments, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(feedbackId, chatId, rating, comments, now);
  
  return {
    id: feedbackId,
    chatId,
    rating,
    comments,
    createdAt: now
  };
};

/**
 * Get feedback by chat ID
 */
const getFeedbackByChatId = (chatId) => {
  return db.prepare('SELECT * FROM feedback WHERE chat_id = ?').get(chatId);
};

/**
 * Get feedback statistics
 */
const getFeedbackStats = () => {
  const stats = {
    averageRating: 0,
    totalFeedback: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
  
  // Get total count and distribution
  const counts = db.prepare('SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating').all();
  
  let totalRating = 0;
  let totalCount = 0;
  
  counts.forEach(row => {
    const rating = row.rating;
    const count = row.count;
    
    stats.ratingDistribution[rating] = count;
    totalRating += rating * count;
    totalCount += count;
  });
  
  stats.totalFeedback = totalCount;
  stats.averageRating = totalCount > 0 ? totalRating / totalCount : 0;
  
  return stats;
};

/**
 * Get all feedback with chat titles
 */
const getAllFeedback = (limit = 100, offset = 0) => {
  return db.prepare(`
    SELECT f.*, c.title as chat_title 
    FROM feedback f
    LEFT JOIN chats c ON f.chat_id = c.id
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
};

/**
 * Get recent feedback
 */
const getRecentFeedback = (limit = 5) => {
  return db.prepare(`
    SELECT f.id, f.chat_id as chatId, f.rating, f.comments, f.created_at as createdAt,
           c.title
    FROM feedback f
    LEFT JOIN chats c ON f.chat_id = c.id
    ORDER BY f.created_at DESC
    LIMIT ?
  `).all(limit);
};

module.exports = {
  addFeedback,
  getFeedbackByChatId,
  getFeedbackStats,
  getAllFeedback,
  getRecentFeedback
};
