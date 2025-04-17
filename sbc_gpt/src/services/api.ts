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
