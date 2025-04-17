import React, { useRef, useEffect } from 'react';
import MessageItem, { MessageItemProps } from './MessageItem';
import { LoadingIndicator } from '../common';
import { useChatContext } from '../../contexts/ChatContext';
import './MessageList.css';

interface MessageListProps {
  messages: MessageItemProps[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useChatContext();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-messages">
          <div className="empty-icon">
            <i className="fas fa-comments"></i>
          </div>
          <h3>No messages yet</h3>
          <p>Start a conversation by typing a message below.</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageItem
            key={index}
            type={message.type}
            content={message.content}
            timestamp={message.timestamp}
            agentName={message.agentName}
            agentAvatar={message.agentAvatar}
          />
        ))
      )}
      {isLoading && messages.length > 0 && (
        <div className="message-item assistant-message loading-message">
          <div className="message-avatar">
            <i className="fas fa-robot"></i>
          </div>
          <div className="message-content">
            <LoadingIndicator />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
