import React, { useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { MessageItemProps } from './MessageItem';
import { useAgentContext } from '../../contexts/AgentContext';
import { useChatContext } from '../../contexts/ChatContext';
import './ChatContainer.css';

const ChatContainer: React.FC = () => {
  // Get agent context
  const { agents, selectedAgentIds, updateAgentStatus, resetAgentStatuses } = useAgentContext();

  // Get chat context
  const { getCurrentChat, addMessageToCurrentChat } = useChatContext();

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
  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage: MessageItemProps = {
      type: 'user',
      content,
      timestamp: new Date()
    };

    // Add message to current chat
    addMessageToCurrentChat(userMessage);
    setIsLoading(true);

    // Get the active selected agents
    const activeAgentIds = selectedAgentIds.filter(id =>
      agents.find(agent => agent.id === id && agent.isActive)
    );

    // Set all selected agents to processing status
    activeAgentIds.forEach(agentId => {
      updateAgentStatus(agentId, 'processing');
    });

    // Simulate agent responses after a delay
    setTimeout(() => {
      if (activeAgentIds.length === 0) {
        // If no agents are selected, use the central router
        const centralRouter = agents.find(agent => agent.id === 'central-router');

        if (centralRouter) {
          updateAgentStatus('central-router', 'processing');

          setTimeout(() => {
            const agentMessage: MessageItemProps = {
              type: 'agent',
              content: `No agents are currently selected to process your query. Please select at least one agent by clicking on the SBC Agents dropdown in the header.`,
              timestamp: new Date(),
              agentName: centralRouter.name
            };

            addMessageToCurrentChat(agentMessage);
            updateAgentStatus('central-router', 'idle');
            setIsLoading(false);
          }, 1500);
        }
      } else {
        // For each selected agent, generate a response with staggered timing
        activeAgentIds.forEach((agentId, index) => {
          const agent = agents.find(a => a.id === agentId);
          if (!agent) return;

          // Simulate different processing times for different agents
          const processingTime = 1000 + (index * 1000) + (Math.random() * 1000);

          setTimeout(() => {
            // Simulate occasional errors
            const hasError = Math.random() < 0.1 && agentId !== 'central-router';

            if (hasError) {
              updateAgentStatus(agentId, 'error');

              const errorMessage: MessageItemProps = {
                type: 'agent',
                content: `Error: Unable to process your request. Please try again later. (Error code: ${Math.floor(Math.random() * 1000)})`,
                timestamp: new Date(),
                agentName: agent.name
              };

              addMessageToCurrentChat(errorMessage);
            } else {
              updateAgentStatus(agentId, 'idle');

              // Generate a response based on agent type
              let response = '';

              // Different responses based on agent type
              if (agent.id === 'central-router') {
                response = `Query Processed: I've routed your query: "${content}" to the appropriate agents. Results will be compiled from all active agents.`;
              } else if (agent.id === 'notion-agent') {
                response = `Notion Search Results: Here are some relevant documents I found for: "${content}"

Project Overview (Last updated: Yesterday)
Meeting Notes (Last updated: 3 days ago)
Research Data (Last updated: Last week)

The information you requested can be found in our internal documentation. Based on your query, I recommend reviewing the Project Overview document.`;
              } else if (agent.id === 'hubspot-agent') {
                response = `Customer Data:

Contact Information:
Name: Acme Corporation
Contact: John Doe
Email: john@example.com
Phone: (555) 123-4567
Status: Active Customer
Last Contact: 2023-05-15

Recent Interactions:
1. Sales call on May 10th
2. Email follow-up on May 12th
3. Product demo on May 15th`;
              } else {
                response = `${agent.name} Response: I've processed your query: "${content}"

Results:
- Found 3 relevant items
- Analysis complete
- Recommendation: Review the attached documentation

This is a simulated response.`;
              }

              const agentMessage: MessageItemProps = {
                type: 'agent',
                content: response,
                timestamp: new Date(),
                agentName: agent.name
              };

              addMessageToCurrentChat(agentMessage);
            }

            // Only set loading to false after the last agent responds
            if (index === activeAgentIds.length - 1) {
              setIsLoading(false);
            }
          }, processingTime);
        });
      }
    }, 500);
  };

  return (
    <div className="chat-container">
      <MessageList messages={messages} />

      <InputArea
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  );
};

export default ChatContainer;
