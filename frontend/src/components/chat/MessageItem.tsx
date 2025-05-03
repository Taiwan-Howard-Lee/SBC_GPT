import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import './MessageItem.css';
import './markdown.css';

export type MessageType = 'user' | 'agent';

export interface MessageItemProps {
  type: MessageType;
  content: string;
  timestamp?: Date;
  agentName?: string;
  agentAvatar?: string;
}

const MessageItem: React.FC<MessageItemProps> = ({
  type,
  content,
  timestamp = new Date(),
  agentName = 'SBC GPT',
  agentAvatar
}) => {
  const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`message-item ${type === 'user' ? 'message-user' : 'message-agent'}`}>
      {type === 'agent' && (
        <div className="message-avatar">
          {agentAvatar ? (
            <img src={agentAvatar} alt={agentName} />
          ) : (
            <div className="avatar-placeholder">
              <i className="fas fa-robot"></i>
            </div>
          )}
        </div>
      )}

      <div className="message-content">
        {type === 'agent' && (
          <div className="message-sender">
            {agentName}
          </div>
        )}
        <div className="message-bubble">
          <div className="markdown-content">
            <ReactMarkdown
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="message-timestamp">
          {formattedTime}
        </div>

        {type === 'agent' && (
          <div className="message-actions">
            <button className="action-button" title="Copy to clipboard">
              <i className="far fa-copy"></i>
            </button>
            <button className="action-button" title="Like">
              <i className="far fa-thumbs-up"></i>
            </button>
            <button className="action-button" title="Dislike">
              <i className="far fa-thumbs-down"></i>
            </button>
            <button className="action-button" title="More options">
              <i className="fas fa-ellipsis-h"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
