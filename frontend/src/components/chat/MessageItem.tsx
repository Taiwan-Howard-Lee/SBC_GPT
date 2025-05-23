import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { extractPlainTextFromMarkdown } from '../../utils/textUtils';
import { useTTSContext } from '../../contexts/TTSContext';
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
  const { speechParams, isSupported: contextSupported } = useTTSContext();

  // Extract plain text from markdown content for speech
  const plainText = extractPlainTextFromMarkdown(content);

  // Use our custom speech synthesis hook with parameters from context
  // No auto-speaking - only manual
  const { isSpeaking, isSupported, toggle } = useSpeechSynthesis({
    text: plainText,
    autoSpeak: false, // Disable auto-speaking completely
    speechParams: speechParams
  });

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

        <div className="message-footer">
          <div className="message-timestamp">
            {formattedTime}
          </div>

          {/* Text-to-Speech button - only show if supported */}
          {isSupported && (
            <button
              className={`tts-button ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggle}
              title={isSpeaking ? "Stop speaking" : "Listen to this message"}
              aria-label={isSpeaking ? "Stop speaking" : "Listen to this message"}
            >
              <i className={`fas ${isSpeaking ? 'fa-volume-up' : 'fa-volume-off'}`}></i>
            </button>
          )}
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
