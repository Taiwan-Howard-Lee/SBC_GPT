import React, { useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { useAgentContext } from '../../contexts/AgentContext';
import { useChatContext } from '../../contexts/ChatContext';
import './ChatContainer.css';

const ChatContainer: React.FC = () => {
  // Get agent context
  const { agents, selectedAgentIds, updateAgentStatus, resetAgentStatuses } = useAgentContext();

  // Get chat context
  const { getCurrentChat, sendMessage, isLoading: chatIsLoading } = useChatContext();

  // Get current chat messages
  const currentChat = getCurrentChat();
  const messages = currentChat?.messages || [];

  // State for loading
  const [isLoading, setIsLoading] = React.useState(false);

  // Reset agent statuses when component unmounts
  useEffect(() => {
    return () => {
      resetAgentStatuses();
    };
  }, [resetAgentStatuses]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    
    // Get the active selected agents
    const activeAgentIds = selectedAgentIds.filter(id =>
      agents.find(agent => agent.id === id && agent.isActive)
    );
    
    // Set central router to processing status
    updateAgentStatus('central-router', 'processing');
    
    try {
      // Send message to backend
      await sendMessage(content);
      
      // Set central router back to idle
      updateAgentStatus('central-router', 'idle');
    } catch (error) {
      console.error('Error sending message:', error);
      updateAgentStatus('central-router', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <MessageList messages={messages} />

      <InputArea
        onSendMessage={handleSendMessage}
        disabled={isLoading || chatIsLoading}
      />
    </div>
  );
};

export default ChatContainer;
