import React, { useState, useRef, useEffect } from 'react';
import './InputArea.css';

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  placeholder = 'Ask anything',
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };



  return (
    <div className="input-area-container">
      <form className="input-area" onSubmit={handleSubmit}>
        <button
          type="button"
          className="input-button"
          title="Attach files"
        >
          <i className="fas fa-plus"></i>
        </button>

        <div className="textarea-container">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="input-textarea"
          />
        </div>

        <div className="input-actions">
          <button
            type="button"
            className="input-button"
            title="Search"
          >
            <i className="fas fa-search"></i>
          </button>

          <button
            type="button"
            className="input-button"
            title="More options"
          >
            <i className="fas fa-ellipsis-h"></i>
          </button>



          <button
            type="submit"
            className={`send-button ${!message.trim() || disabled ? 'disabled' : ''}`}
            disabled={!message.trim() || disabled}
            title="Send message"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </form>

      <div className="input-footer">
        <span className="footer-text">
          SBC GPT can make mistakes. Check important info.
        </span>
      </div>
    </div>
  );
};

export default InputArea;
