import React from 'react';
import ThemeToggle from '../theme/ThemeToggle';
import './Header.css';

interface HeaderProps {
  onOpenAgentSelector: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenAgentSelector }) => {

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-title">
          <span>SBC Notion Agent</span>
          <button className="dropdown-button" onClick={onOpenAgentSelector}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="header-right">
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
