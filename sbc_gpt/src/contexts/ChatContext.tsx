import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { MessageItemProps } from '../components/chat/MessageItem';

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
  createNewChat: () => void;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  addMessageToCurrentChat: (message: MessageItemProps) => void;
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

// Initial welcome messages for a new chat
const getInitialMessages = (): MessageItemProps[] => [
  {
    type: 'agent',
    content: "Hey! I'm SBC GPT—your AI sidekick, built to help you with just about anything you need. Want to write something, solve a problem, brainstorm ideas, learn something new, or just chat? I'm here for all of it.",
    timestamp: new Date(),
    agentName: 'SBC GPT'
  }
];

// Generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Provider component
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // State for all chats
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 'default',
      title: 'New Conversation',
      messages: getInitialMessages(),
      messageCount: 1,
      lastUpdated: new Date()
    }
  ]);

  // State for the current active chat
  const [currentChatId, setCurrentChatId] = useState<string>('default');

  // Create a new chat
  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: generateId(),
      title: 'New Conversation',
      messages: getInitialMessages(),
      messageCount: 1,
      lastUpdated: new Date()
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setCurrentChatId(newChat.id);
  }, []);

  // Switch to a different chat
  const switchChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  // Add a message to the current chat
  const addMessageToCurrentChat = useCallback((message: MessageItemProps) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === currentChatId
          ? {
              ...chat,
              messages: [...chat.messages, message],
              messageCount: chat.messageCount + 1,
              lastUpdated: new Date(),
              // Update title based on first user message if it's still the default title
              title: chat.title === 'New Conversation' && message.type === 'user'
                ? message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
                : chat.title
            }
          : chat
      )
    );
  }, [currentChatId]);

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
  }, []);

  // Delete a chat
  const deleteChat = useCallback((chatId: string) => {
    // Don't delete if it's the only chat
    if (chats.length <= 1) {
      return;
    }

    // Remove the chat
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

    // If the deleted chat was the current one, switch to the first available chat
    if (chatId === currentChatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0].id);
      } else {
        // If no chats remain, create a new one
        createNewChat();
      }
    }
  }, [chats, currentChatId, createNewChat]);

  // Context value
  const value = {
    chats,
    currentChatId,
    createNewChat,
    switchChat,
    deleteChat,
    addMessageToCurrentChat,
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
