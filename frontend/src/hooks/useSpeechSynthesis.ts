import { useState, useEffect, useCallback, useRef } from 'react';

// Voice interface
export interface Voice {
  id: string;
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

// Speech parameters interface
export interface SpeechParams {
  rate?: number;  // 0.1 to 10, default is 1
  pitch?: number; // 0 to 2, default is 1
  volume?: number; // 0 to 1, default is 1
  voiceId?: string; // Voice identifier
}

interface UseSpeechSynthesisProps {
  text: string;
  autoSpeak?: boolean;
  lang?: string;
  speechParams?: SpeechParams;
}

/**
 * Custom hook for text-to-speech functionality using the Web Speech API
 */
export const useSpeechSynthesis = ({
  text,
  autoSpeak = false,
  lang = 'en-US',
  speechParams = {}
}: UseSpeechSynthesisProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Default speech parameters
  const defaultParams: Required<SpeechParams> = {
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceId: ''
  };

  // Merge default and user-provided parameters
  const params = { ...defaultParams, ...speechParams };

  // Check if speech synthesis is supported
  useEffect(() => {
    const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setIsSupported(supported);

    if (!supported) {
      console.warn('Speech synthesis is not supported in this browser');
    }
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    // Function to get and set available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();

      if (availableVoices.length > 0) {
        // Convert to our Voice interface
        const voiceList: Voice[] = availableVoices.map(voice => ({
          id: voice.voiceURI,
          name: voice.name,
          lang: voice.lang,
          default: voice.default,
          localService: voice.localService,
          voiceURI: voice.voiceURI
        }));

        setVoices(voiceList);

        // Set default voice based on language or user preference
        if (params.voiceId) {
          const selectedVoice = availableVoices.find(v => v.voiceURI === params.voiceId);
          if (selectedVoice) {
            setCurrentVoice(selectedVoice);
          }
        } else {
          // Try to find a voice that matches the language
          const langVoice = availableVoices.find(v => v.lang.includes(lang));
          // Or use the default voice
          const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
          setCurrentVoice(langVoice || defaultVoice);
        }
      }
    };

    // Load voices immediately (for Firefox)
    loadVoices();

    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, lang, params.voiceId]);

  // Initialize utterance when text or voice changes
  useEffect(() => {
    if (!isSupported || !text) return;

    // Create a new utterance
    const newUtterance = new SpeechSynthesisUtterance(text);

    // Set language
    newUtterance.lang = lang;

    // Set voice if available
    if (currentVoice) {
      newUtterance.voice = currentVoice;
    }

    // Set speech parameters
    newUtterance.rate = params.rate;
    newUtterance.pitch = params.pitch;
    newUtterance.volume = params.volume;

    // Set event handlers
    newUtterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    newUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    // Store the utterance in ref
    utteranceRef.current = newUtterance;

    // Auto-speak is disabled completely
    // No auto-speaking will occur, even if autoSpeak is true

    // Cleanup function
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text, lang, currentVoice, params.rate, params.pitch, params.volume, isSupported, autoSpeak]);

  // Handle page visibility changes (fixes issues with Chrome)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isSpeaking) {
        // Page is hidden, pause speech
        window.speechSynthesis.pause();
        setIsPaused(true);
      } else if (!document.hidden && isPaused) {
        // Page is visible again, resume speech
        window.speechSynthesis.resume();
        setIsPaused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSpeaking, isPaused, isSupported]);

  // Speak function
  const speak = useCallback(() => {
    if (!isSupported || !utteranceRef.current) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Start speaking
    window.speechSynthesis.speak(utteranceRef.current);
    setIsSpeaking(true);
    setIsPaused(false);
  }, [isSupported]);

  // Stop function
  const stop = useCallback(() => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  // Toggle function (speak/stop)
  const toggle = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      speak();
    }
  }, [isSpeaking, speak, stop]);

  // Set voice by ID
  const setVoice = useCallback((voiceId: string) => {
    if (!isSupported) return;

    const availableVoices = window.speechSynthesis.getVoices();
    const voice = availableVoices.find(v => v.voiceURI === voiceId);

    if (voice) {
      setCurrentVoice(voice);
    }
  }, [isSupported]);

  // Set speech rate
  const setRate = useCallback((rate: number) => {
    if (!isSupported || !utteranceRef.current) return;
    utteranceRef.current.rate = rate;
  }, [isSupported]);

  // Set speech pitch
  const setPitch = useCallback((pitch: number) => {
    if (!isSupported || !utteranceRef.current) return;
    utteranceRef.current.pitch = pitch;
  }, [isSupported]);

  // Set speech volume
  const setVolume = useCallback((volume: number) => {
    if (!isSupported || !utteranceRef.current) return;
    utteranceRef.current.volume = volume;
  }, [isSupported]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    currentVoice: currentVoice ? {
      id: currentVoice.voiceURI,
      name: currentVoice.name,
      lang: currentVoice.lang,
      default: currentVoice.default,
      localService: currentVoice.localService,
      voiceURI: currentVoice.voiceURI
    } : null,
    params: {
      rate: params.rate,
      pitch: params.pitch,
      volume: params.volume
    },
    speak,
    stop,
    toggle,
    setVoice,
    setRate,
    setPitch,
    setVolume
  };
};

/**
 * Utility function to check if speech synthesis is supported
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};
