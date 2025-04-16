import { MessageItemProps } from '../components/chat/MessageItem';

const API_URL = 'http://localhost:3001/api';

// Get session ID from localStorage
const getSessionId = (): string | null => {
  return localStorage.getItem('sessionId');
};

// API request headers
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const sessionId = getSessionId();
  if (sessionId) {
    headers['Authorization'] = sessionId;
  }

  return headers;
};

// Admin headers with admin token
const getAdminHeaders = (): HeadersInit => {
  const headers = getHeaders();
  const adminToken = localStorage.getItem('adminToken');

  if (adminToken) {
    headers['Authorization'] = adminToken;
  }

  return headers;
};

// Login
export const login = async (password: string): Promise<{ success: boolean; sessionId?: string; message: string }> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};

// Validate session
export const validateSession = async (): Promise<boolean> => {
  const sessionId = getSessionId();
  if (!sessionId) return false;

  try {
    const response = await fetch(`${API_URL}/auth/validate`, {
      headers: {
        'Authorization': sessionId,
      },
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

// Get all chats
export const getChats = async () => {
  try {
    const response = await fetch(`${API_URL}/chats`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return await response.json();
  } catch (error) {
    console.error('Get chats error:', error);
    throw error;
  }
};

// Get chat by ID
export const getChatById = async (chatId: string) => {
  try {
    const response = await fetch(`${API_URL}/chats/${chatId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }

    return await response.json();
  } catch (error) {
    console.error('Get chat error:', error);
    throw error;
  }
};

// Create a new chat
export const createChat = async (title: string = 'New Conversation') => {
  try {
    const response = await fetch(`${API_URL}/chats`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to create chat');
    }

    return await response.json();
  } catch (error) {
    console.error('Create chat error:', error);
    throw error;
  }
};

// Delete a chat
export const deleteChat = async (chatId: string) => {
  try {
    const response = await fetch(`${API_URL}/chats/${chatId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete chat');
    }

    return true;
  } catch (error) {
    console.error('Delete chat error:', error);
    throw error;
  }
};

// Update chat title
export const updateChatTitle = async (chatId: string, title: string) => {
  try {
    const response = await fetch(`${API_URL}/chats/${chatId}/title`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to update chat title');
    }

    return await response.json();
  } catch (error) {
    console.error('Update chat title error:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (chatId: string, content: string) => {
  try {
    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return await response.json();
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

// Convert backend message format to frontend format
export const convertMessage = (message: any): MessageItemProps => {
  return {
    type: message.role === 'user' ? 'user' : 'agent',
    content: message.content,
    timestamp: new Date(message.timestamp),
    agentName: message.role === 'assistant' ? message.model || 'SBC GPT' : undefined
  };
};

// Convert backend chat format to frontend format
export const convertChat = (chat: any) => {
  return {
    id: chat.id,
    title: chat.title,
    messages: chat.messages ? chat.messages.map(convertMessage) : [],
    messageCount: chat.messageCount || (chat.messages ? chat.messages.length : 0),
    lastUpdated: new Date(chat.updatedAt || chat.createdAt)
  };
};

// Admin login
export const adminLogin = async (password: string) => {
  try {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    return await response.json();
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

// Get active chats (admin)
export const getActiveChats = async () => {
  try {
    const response = await fetch(`${API_URL}/admin/chats/active`, {
      headers: getAdminHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active chats');
    }

    return await response.json();
  } catch (error) {
    console.error('Get active chats error:', error);
    throw error;
  }
};

// Get deleted chats (admin)
export const getDeletedChats = async () => {
  try {
    const response = await fetch(`${API_URL}/admin/chats/deleted`, {
      headers: getAdminHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch deleted chats');
    }

    return await response.json();
  } catch (error) {
    console.error('Get deleted chats error:', error);
    throw error;
  }
};

// Get chat insights (admin)
export const getChatInsights = async () => {
  try {
    const response = await fetch(`${API_URL}/admin/insights`, {
      headers: getAdminHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat insights');
    }

    return await response.json();
  } catch (error) {
    console.error('Get chat insights error:', error);
    throw error;
  }
};

// Submit feedback for a chat
export const submitFeedback = async (chatId: string, rating: number, comments: string = '') => {
  try {
    const response = await fetch(`${API_URL}/feedback/chats/${chatId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rating, comments }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }

    return await response.json();
  } catch (error) {
    console.error('Submit feedback error:', error);
    throw error;
  }
};
