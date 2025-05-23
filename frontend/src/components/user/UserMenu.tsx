import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTTSContext } from '../../contexts/TTSContext';
import { useAuthContext } from '../../contexts/AuthContext';
import TTSSettings from '../tts/TTSSettings';
import './UserMenu.css';

const UserMenu: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTTSSettingsOpen, setIsTTSSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const { speechParams, updateSpeechParams, isSupported } = useTTSContext();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      setIsMenuOpen(false);
      logout();
    }
  };

  const handleAdminEntry = () => {
    setIsMenuOpen(false);
    navigate('/admin-login');
  };

  const handleOpenTTSSettings = () => {
    setIsMenuOpen(false);
    setIsTTSSettingsOpen(true);
  };

  const handleCloseTTSSettings = () => {
    setIsTTSSettingsOpen(false);
  };

  const handleSaveTTSSettings = (params) => {
    updateSpeechParams(params);
  };

  return (
    <div className="user-menu-container" ref={menuRef}>
      <div className="user-profile" onClick={toggleMenu}>
        <div className="avatar">
          <i className="fas fa-user"></i>
        </div>
        <span className="username">User</span>
        <i className={`fas fa-chevron-${isMenuOpen ? 'up' : 'down'} menu-arrow`}></i>
      </div>

      {isMenuOpen && (
        <div className="user-dropdown">
          {isSupported && (
            <button className="dropdown-item" onClick={handleOpenTTSSettings}>
              <i className="fas fa-volume-up"></i>
              <span>Voice Settings</span>
            </button>
          )}

          <button className="dropdown-item" onClick={handleAdminEntry}>
            <i className="fas fa-info-circle"></i>
            <span>Elites Entry</span>
          </button>

          <button className="dropdown-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* TTS Settings Modal */}
      <TTSSettings
        isOpen={isTTSSettingsOpen}
        onClose={handleCloseTTSSettings}
        onSave={handleSaveTTSSettings}
        initialParams={speechParams}
      />
    </div>
  );
};

export default UserMenu;
