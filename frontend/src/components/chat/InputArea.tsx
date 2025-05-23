import React, { useState, useRef, useEffect } from 'react';
import { useSpeechRecognition, isSpeechRecognitionSupported } from '../../hooks/useSpeechRecognition';
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

  // Use our custom speech recognition hook
  const {
    transcript,
    isListening,
    isSupported,
    error,
    toggleListening,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,
    clearTranscriptOnListen: false,
    timeout: 15000 // 15 seconds timeout
  });

  // Update message with transcript when it changes
  useEffect(() => {
    if (isListening && transcript) {
      setMessage(transcript);

      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [transcript, isListening]);

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
      // If we're listening, stop
      if (isListening) {
        toggleListening();
      }

      onSendMessage(message);
      setMessage('');
      resetTranscript();

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

  const handleVoiceInput = () => {
    // If we're not currently listening, reset transcript before starting
    if (!isListening) {
      // Reset transcript to start fresh
      resetTranscript();

      // If the message field is empty, make sure we're starting with a clean slate
      if (!message.trim()) {
        setMessage('');
      }
    }

    // Toggle speech recognition
    toggleListening();

    if (error) {
      console.error('Speech recognition error:', error);
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
            onChange={(e) => {
              setMessage(e.target.value);
              // If the user manually clears the text, also reset the transcript
              if (e.target.value === '') {
                resetTranscript();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : placeholder}
            disabled={disabled || isListening}
            rows={1}
            className="input-textarea"
          />
          {isListening && (
            <div className="listening-indicator">
              <div className="listening-dot"></div>
              <div className="listening-dot"></div>
              <div className="listening-dot"></div>
            </div>
          )}
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

          {isSupported && (
            <button
              type="button"
              className={`input-button voice-button ${isListening ? 'recording' : ''}`}
              onClick={handleVoiceInput}
              disabled={disabled}
              title={isListening ? "Stop recording" : "Voice input"}
              aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
          )}

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
          {error ? (
            <span className="error-text">{error}</span>
          ) : (
            "SBC GPT can make mistakes. Check important info."
          )}
        </span>
      </div>
    </div>
  );
};

export default InputArea;
