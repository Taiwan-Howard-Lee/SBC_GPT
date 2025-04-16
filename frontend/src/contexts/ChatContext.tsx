import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MessageItemProps } from '../components/chat/MessageItem';
import * as api from '../services/api';

// Define the structure of a chat
export interface Chat {
  id: string;
  title: string;
  messages: MessageItemProps[];
  messageCount: number;
  lastUpdated: Date;
}

// Define the context type
interface ChatContextType {
  chats: Chat[];
  currentChatId: string;
  isLoading: boolean;
  createNewChat: () => Promise<void>;
  switchChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  getCurrentChat: () => Chat | null;
  updateChatTitle: (chatId: string, title: string) => void;
}

// Create the context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Custom hook to use the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

// Provider component
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // State for all chats
  const [chats, setChats] = useState<Chat[]>([]);
  
  // State for the current active chat
  const [currentChatId, setCurrentChatId] = useState<string>('');
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch chats on mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        const chatData = await api.getChats();
        
        if (chatData && chatData.length > 0) {
          const convertedChats = chatData.map(api.convertChat);
          setChats(convertedChats);
          setCurrentChatId(convertedChats[0].id);
        } else {
          // If no chats exist, create a new one
          const newChat = await api.createChat();
          const convertedChat = api.convertChat(newChat);
          setChats([convertedChat]);
          setCurrentChatId(convertedChat.id);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  // Create a new chat
  const createNewChat = useCallback(async () => {
    try {
      setIsLoading(true);
      const newChat = await api.createChat();
      const convertedChat = api.convertChat(newChat);
      
      setChats(prevChats => [convertedChat, ...prevChats]);
      setCurrentChatId(convertedChat.id);
    } catch (error) {
      console.error('Error creating new chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Switch to a different chat
  const switchChat = useCallback(async (chatId: string) => {
    try {
      setIsLoading(true);
      // Fetch the full chat with messages
      const chatData = await api.getChatById(chatId);
      const convertedChat = api.convertChat(chatData);
      
      // Update the chat in the state
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId ? convertedChat : chat
        )
      );
      
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Error switching chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message and get a response
  const sendMessage = useCallback(async (content: string) => {
    if (!currentChatId || !content.trim()) return;
    
    try {
      // Add optimistic user message
      const userMessage: MessageItemProps = {
        type: 'user',
        content,
        timestamp: new Date()
      };
      
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChatId 
            ? {
                ...chat,
                messages: [...chat.messages, userMessage],
                messageCount: chat.messageCount + 1,
                lastUpdated: new Date()
              }
            : chat
        )
      );
      
      // Send message to API
      const response = await api.sendMessage(currentChatId, content);
      
      // Convert the response messages
      const assistantMessage = api.convertMessage(response.assistantMessage);
      
      // Update chat with assistant message
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChatId 
            ? {
                ...chat,
                messages: [...chat.messages, assistantMessage],
                messageCount: chat.messageCount + 1,
                lastUpdated: new Date(),
                // Update title based on first user message if it's still the default title
                title: chat.title === 'New Conversation' && chat.messages.length <= 2
                  ? content.substring(0, 30) + (content.length > 30 ? '...' : '')
                  : chat.title
              }
            : chat
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the optimistic user message if there was an error
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChatId 
            ? {
                ...chat,
                messages: chat.messages.slice(0, -1),
                messageCount: Math.max(0, chat.messageCount - 1)
              }
            : chat
        )
      );
    }
  }, [currentChatId]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    // Don't delete if it's the only chat
    if (chats.length <= 1) {
      return;
    }

    try {
      await api.deleteChat(chatId);
      
      // Remove the chat from state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      // If the deleted chat was the current one, switch to the first available chat
      if (chatId === currentChatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId);
        if (remainingChats.length > 0) {
          await switchChat(remainingChats[0].id);
        } else {
          // If no chats remain, create a new one
          await createNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [chats, currentChatId, createNewChat, switchChat]);

  // Get the current chat
  const getCurrentChat = useCallback(() => {
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  // Update a chat's title
  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, title }
          : chat
      )
    );
    // Note: We're not implementing this on the backend yet
  }, []);

  // Context value
  const value = {
    chats,
    currentChatId,
    isLoading,
    createNewChat,
    switchChat,
    deleteChat,
    sendMessage,
    getCurrentChat,
    updateChatTitle
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
