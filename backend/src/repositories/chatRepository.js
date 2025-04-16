const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * Get all chats
 */
const getAllChats = () => {
  return db.prepare(`
    SELECT c.id, c.title, c.created_at as createdAt, c.updated_at as updatedAt,
           COUNT(m.id) as messageCount
    FROM chats c
    LEFT JOIN messages m ON c.id = m.chat_id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `).all();
};

/**
 * Get chat by ID with messages
 */
const getChatById = (chatId) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  
  if (chat) {
    chat.messages = db.prepare(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC'
    ).all(chatId);
    
    // Format the messages
    chat.messages = chat.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      model: msg.model
    }));
  }
  
  return chat;
};

/**
 * Create a new chat
 */
const createChat = (title) => {
  const chatId = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(
    'INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(chatId, title, now, now);
  
  return {
    id: chatId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
};

/**
 * Add system message to a chat
 */
const addSystemMessage = (chatId, content) => {
  const messageId = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(
    'INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(messageId, chatId, 'system', content, now);
  
  return {
    id: messageId,
    role: 'system',
    content,
    timestamp: now
  };
};

/**
 * Update chat title
 */
const updateChatTitle = (chatId, title) => {
  const now = new Date().toISOString();
  
  const result = db.prepare(
    'UPDATE chats SET title = ?, updated_at = ? WHERE id = ?'
  ).run(title, now, chatId);
  
  if (result.changes === 0) {
    return null;
  }
  
  return {
    id: chatId,
    title,
    updatedAt: now
  };
};

/**
 * Delete chat
 */
const deleteChat = (chatId) => {
  return db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
};

/**
 * Add message to chat
 */
const addMessage = (chatId, role, content, model = null) => {
  const messageId = uuidv4();
  const now = new Date().toISOString();
  
  db.prepare(
    'INSERT INTO messages (id, chat_id, role, content, model, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(messageId, chatId, role, content, model, now);
  
  // Update chat's updated_at timestamp
  db.prepare(
    'UPDATE chats SET updated_at = ? WHERE id = ?'
  ).run(now, chatId);
  
  return {
    id: messageId,
    role,
    content,
    model,
    timestamp: now
  };
};

module.exports = {
  getAllChats,
  getChatById,
  createChat,
  addSystemMessage,
  updateChatTitle,
  deleteChat,
  addMessage
};
