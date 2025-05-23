import React, { createContext, useContext, useState, useEffect } from 'react';

// Speech parameters interface
export interface SpeechParams {
  rate: number;  // 0.1 to 10, default is 1
  pitch: number; // 0 to 2, default is 1
  volume: number; // 0 to 1, default is 1
  voiceId: string; // Voice identifier
}

interface TTSContextType {
  speechParams: SpeechParams;
  updateSpeechParams: (params: Partial<SpeechParams>) => void;
  isSupported: boolean;
}

// Default speech parameters
const defaultSpeechParams: SpeechParams = {
  rate: 1,
  pitch: 1,
  volume: 1,
  voiceId: ''
};

// Create context
const TTSContext = createContext<TTSContextType>({
  speechParams: defaultSpeechParams,
  updateSpeechParams: () => {},
  isSupported: false
});

// Custom hook to use the TTS context
export const useTTSContext = () => useContext(TTSContext);

// TTS Provider component
export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [speechParams, setSpeechParams] = useState<SpeechParams>(() => {
    // Try to load saved settings from localStorage
    const savedParams = localStorage.getItem('tts-settings');
    if (savedParams) {
      try {
        return JSON.parse(savedParams);
      } catch (error) {
        console.error('Failed to parse saved TTS settings:', error);
      }
    }
    return defaultSpeechParams;
  });
  
  const [isSupported, setIsSupported] = useState(false);
  
  // Check if speech synthesis is supported
  useEffect(() => {
    const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setIsSupported(supported);
    
    if (!supported) {
      console.warn('Speech synthesis is not supported in this browser');
    }
  }, []);
  
  // Update speech parameters
  const updateSpeechParams = (params: Partial<SpeechParams>) => {
    setSpeechParams(prev => {
      const newParams = { ...prev, ...params };
      
      // Save to localStorage
      localStorage.setItem('tts-settings', JSON.stringify(newParams));
      
      return newParams;
    });
  };
  
  // Context value
  const value = {
    speechParams,
    updateSpeechParams,
    isSupported
  };
  
  return (
    <TTSContext.Provider value={value}>
      {children}
    </TTSContext.Provider>
  );
};

export default TTSContext;
