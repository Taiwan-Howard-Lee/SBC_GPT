const { processMessage } = require('../services/geminiService');
const agentService = require('../services/agentService');
const chatRepo = require('../repositories/chatRepository');

/**
 * Get all chats
 */
const getAllChats = (req, res) => {
  try {
    const chats = chatRepo.getAllChats();
    res.json(chats);
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
    const title = req.body.title || 'New Conversation';
    const systemMessage = 'You are a helpful assistant that provides accurate, informative responses. You can access various tools and agents to help answer questions.';

    // Create chat in database
    const newChat = chatRepo.createChat(title);

    // Add system message
    const message = chatRepo.addSystemMessage(newChat.id, systemMessage);

    // Add message to response
    newChat.messages = [message];

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
    const chat = chatRepo.getChatById(req.params.id);

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
    const chatId = req.params.id;

    // Check if chat exists
    const chat = chatRepo.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Delete chat from database
    const result = chatRepo.deleteChat(chatId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Chat not found' });
    }

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

    // Check if chat exists
    const chat = chatRepo.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Add user message to database
    const userMessage = chatRepo.addMessage(chatId, 'user', content);

    try {
      // First, check if we should route to an agent
      let response;

      // Try to route through the agent service first
      try {
        console.log(`Attempting to route query to agents: "${content}"`);
        const agentResponse = await agentService.routeQuery(content);

        if (agentResponse && agentResponse.success) {
          console.log('Query successfully handled by agent');
          response = {
            content: agentResponse.message,
            model: 'agent-' + (agentResponse.source || 'router')
          };
        } else {
          console.log('No agent could handle the query, falling back to Gemini');
          // If no agent could handle it, fall back to Gemini
          const messages = chat.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Add the new user message
          messages.push({ role: 'user', content });

          // Get AI response from Gemini
          response = await processMessage(messages);
        }
      } catch (agentError) {
        console.error('Error routing through agents:', agentError);
        // Fall back to Gemini on agent error
        const messages = chat.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Add the new user message
        messages.push({ role: 'user', content });

        // Get AI response from Gemini
        response = await processMessage(messages);
      }

      // Add assistant message to database
      const assistantMessage = chatRepo.addMessage(
        chatId,
        'assistant',
        response.content,
        response.model
      );

      // Update chat title if it's the first user message
      if (chat.messages.filter(m => m.role === 'user').length === 0) {
        chatRepo.updateChatTitle(chatId, content.substring(0, 30) + (content.length > 30 ? '...' : ''));
      }

      res.json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error('Error processing message:', error);

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

/**
 * Update chat title
 */
const updateChatTitle = (req, res) => {
  try {
    const chatId = req.params.id;
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Chat title cannot be empty' });
    }

    // Update the chat title in database
    const updatedChat = chatRepo.updateChatTitle(chatId, title.trim());

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat title:', error);
    res.status(500).json({ message: 'Error updating chat title', error: error.message });
  }
};

module.exports = {
  getAllChats,
  createChat,
  getChatById,
  deleteChat,
  addMessage,
  updateChatTitle
};
