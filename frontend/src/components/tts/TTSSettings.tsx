import React, { useState, useEffect } from 'react';
import './TTSSettings.css';

// Voice interface
export interface Voice {
  id: string;
  name: string;
  lang: string;
  default: boolean;
}

// Speech parameters interface
export interface SpeechParams {
  rate: number;  // 0.1 to 10, default is 1
  pitch: number; // 0 to 2, default is 1
  volume: number; // 0 to 1, default is 1
  voiceId: string; // Voice identifier
}

interface TTSSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: SpeechParams) => void;
  initialParams?: Partial<SpeechParams>;
}

const TTSSettings: React.FC<TTSSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  initialParams = {}
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [params, setParams] = useState<SpeechParams>({
    rate: initialParams.rate ?? 1,
    pitch: initialParams.pitch ?? 1,
    volume: initialParams.volume ?? 1,
    voiceId: initialParams.voiceId ?? ''
  });
  const [isSupported, setIsSupported] = useState(true);

  // Check if speech synthesis is supported
  useEffect(() => {
    const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setIsSupported(supported);
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    // Function to get and set available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      
      if (availableVoices.length > 0) {
        // Convert to our Voice interface
        const voiceList: Voice[] = availableVoices
          .filter(voice => voice.lang.includes('en')) // Only English voices
          .map(voice => ({
            id: voice.voiceURI,
            name: voice.name,
            lang: voice.lang,
            default: voice.default
          }));
        
        setVoices(voiceList);
        
        // Set default voice if none is selected
        if (!params.voiceId && voiceList.length > 0) {
          const defaultVoice = voiceList.find(v => v.default) || voiceList[0];
          setParams(prev => ({ ...prev, voiceId: defaultVoice.id }));
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
  }, [isSupported]);

  // Handle parameter changes
  const handleParamChange = (param: keyof SpeechParams, value: number | string) => {
    setParams(prev => ({ ...prev, [param]: value }));
  };

  // Test current voice settings
  const testVoice = () => {
    if (!isSupported) return;
    
    const utterance = new SpeechSynthesisUtterance('This is a test of the current voice settings.');
    utterance.rate = params.rate;
    utterance.pitch = params.pitch;
    utterance.volume = params.volume;
    
    // Set voice if available
    if (params.voiceId) {
      const availableVoices = window.speechSynthesis.getVoices();
      const voice = availableVoices.find(v => v.voiceURI === params.voiceId);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    // Cancel any ongoing speech and speak
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Save settings
  const handleSave = () => {
    onSave(params);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="tts-settings-overlay">
      <div className="tts-settings-modal">
        <div className="tts-settings-header">
          <h2>Text-to-Speech Settings</h2>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="tts-settings-content">
          {!isSupported ? (
            <div className="tts-not-supported">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Text-to-speech is not supported in your browser.</p>
            </div>
          ) : (
            <>
              <div className="settings-group">
                <label htmlFor="voice-select">Voice</label>
                <select 
                  id="voice-select"
                  value={params.voiceId}
                  onChange={(e) => handleParamChange('voiceId', e.target.value)}
                >
                  {voices.length === 0 ? (
                    <option value="">Loading voices...</option>
                  ) : (
                    voices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              <div className="settings-group">
                <label htmlFor="rate-slider">
                  Speed: {params.rate.toFixed(1)}
                </label>
                <input
                  id="rate-slider"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={params.rate}
                  onChange={(e) => handleParamChange('rate', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="settings-group">
                <label htmlFor="pitch-slider">
                  Pitch: {params.pitch.toFixed(1)}
                </label>
                <input
                  id="pitch-slider"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={params.pitch}
                  onChange={(e) => handleParamChange('pitch', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="settings-group">
                <label htmlFor="volume-slider">
                  Volume: {params.volume.toFixed(1)}
                </label>
                <input
                  id="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={params.volume}
                  onChange={(e) => handleParamChange('volume', parseFloat(e.target.value))}
                />
              </div>
              
              <div className="settings-actions">
                <button className="test-button" onClick={testVoice}>
                  <i className="fas fa-play"></i> Test
                </button>
                <button className="save-button" onClick={handleSave}>
                  <i className="fas fa-save"></i> Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TTSSettings;
