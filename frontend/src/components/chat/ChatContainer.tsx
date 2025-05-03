import React, { useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { useAgentContext } from '../../contexts/AgentContext';
import { useChatContext } from '../../contexts/ChatContext';
import './ChatContainer.css';

const ChatContainer: React.FC = () => {
  // Get agent context
  const { updateAgentStatus, resetAgentStatuses, selectedAgentIds } = useAgentContext();

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

  // Automatically trigger Notion agent when it's selected
  useEffect(() => {
    const isNotionSelected = selectedAgentIds.includes('notion-agent');
    const hasNoMessages = messages.length === 0;

    // If Notion agent is selected and we're in a new chat, trigger it automatically
    if (isNotionSelected && hasNoMessages && !isLoading && !chatIsLoading) {
      console.log('Automatically triggering Notion agent');
      // Send an empty message to trigger the Notion agent
      sendMessage('');
    }
  }, [selectedAgentIds, messages.length, isLoading, chatIsLoading, sendMessage]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);

    // Check which agents are active
    const isNotionSelected = selectedAgentIds.includes('notion-agent');

    // Set central router to processing status
    updateAgentStatus('central-router', 'processing');

    // If Notion agent is selected, set it to processing status too
    if (isNotionSelected) {
      updateAgentStatus('notion-agent', 'processing');
    }

    try {
      // Send message to backend
      await sendMessage(content);

      // Set agents back to idle
      updateAgentStatus('central-router', 'idle');
      if (isNotionSelected) {
        updateAgentStatus('notion-agent', 'idle');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      updateAgentStatus('central-router', 'error');
      if (isNotionSelected) {
        updateAgentStatus('notion-agent', 'error');
      }
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
