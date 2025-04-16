const { v4: uuidv4 } = require('uuid');
const { processMessage } = require('../services/geminiService');

// In-memory chat storage
const chats = new Map();

/**
 * Get all chats
 */
const getAllChats = (req, res) => {
  try {
    const chatList = Array.from(chats.values()).map(chat => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length
    }));

    res.json(chatList);
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ message: 'Error retrieving chats', error: error.message });
  }
};

/**
 * Create a new chat
 */
const createChat = (req, res) => {
  try {
    const chatId = uuidv4();
    const newChat = {
      id: chatId,
      title: req.body.title || 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides accurate, informative responses. You can access various tools and agents to help answer questions.',
          timestamp: new Date()
        }
      ]
    };

    chats.set(chatId, newChat);
    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Error creating chat', error: error.message });
  }
};

/**
 * Get chat by ID
 */
const getChatById = (req, res) => {
  try {
    const chat = chats.get(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(chat);
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(500).json({ message: 'Error retrieving chat', error: error.message });
  }
};

/**
 * Delete chat
 */
const deleteChat = (req, res) => {
  try {
    if (!chats.has(req.params.id)) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chats.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ message: 'Error deleting chat', error: error.message });
  }
};

/**
 * Add message to chat
 */
const addMessage = async (req, res) => {
  try {
    const chatId = req.params.id;
    const chat = chats.get(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };

    chat.messages.push(userMessage);

    try {
      // Process with Gemini
      const response = await processMessage(chat.messages);

      // Add assistant message
      const assistantMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        model: response.model
      };

      chat.messages.push(assistantMessage);
      chat.updatedAt = new Date();

      // Update chat title if it's the first user message
      if (chat.messages.filter(m => m.role === 'user').length === 1) {
        chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      }

      res.json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error('Error processing message:', error);

      // Remove the user message since processing failed
      chat.messages.pop();

      res.status(500).json({
        message: 'Error processing message with AI model',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Error adding message', error: error.message });
  }
};

module.exports = {
  getAllChats,
  createChat,
  getChatById,
  deleteChat,
  addMessage
};
