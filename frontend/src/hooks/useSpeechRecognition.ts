import { useState, useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition as useSR } from 'react-speech-recognition';

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  clearTranscriptOnListen?: boolean;
  autoStart?: boolean;
  timeout?: number; // in milliseconds
}

/**
 * Custom hook for speech recognition functionality
 */
export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const {
    continuous = false,
    clearTranscriptOnListen = true,
    autoStart = false,
    timeout = 10000 // 10 seconds default timeout
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Use the library's hook
  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition
  } = useSR();

  // Check if speech recognition is supported
  useEffect(() => {
    setIsSupported(browserSupportsSpeechRecognition);

    if (!browserSupportsSpeechRecognition) {
      setError('Your browser does not support speech recognition.');
    }
  }, [browserSupportsSpeechRecognition]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && isSupported && !isListening) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isSupported]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    try {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }

      // Always manually handle transcript clearing
      // We'll do this in the component when needed

      // Start recognition
      SpeechRecognition.startListening({ continuous });
      setIsListening(true);
      setError(null);

      // Set timeout if specified
      if (timeout > 0) {
        const id = setTimeout(() => {
          stopListening();
        }, timeout);
        setTimeoutId(id);
      }
    } catch (err) {
      setError('Error starting speech recognition');
      console.error('Speech recognition error:', err);
    }
  }, [isSupported, continuous, timeout, timeoutId]);

  // Stop listening
  const stopListening = useCallback(() => {
    try {
      SpeechRecognition.stopListening();
      setIsListening(false);

      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    } catch (err) {
      setError('Error stopping speech recognition');
      console.error('Speech recognition error:', err);
    }
  }, [timeoutId]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Sync our state with the library's state
  useEffect(() => {
    setIsListening(listening);
  }, [listening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        SpeechRecognition.stopListening();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isListening, timeoutId]);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript
  };
};

/**
 * Utility function to check if speech recognition is supported
 */
export const isSpeechRecognitionSupported = (): boolean => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};
