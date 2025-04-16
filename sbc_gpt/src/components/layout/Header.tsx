import React from 'react';
import { AgentSelector, AgentId } from '../agents';
import { Modal } from '../common';
import { availableAgents } from '../../data/agents';
import './Header.css';

interface HeaderProps {
  onOpenAgentSelector: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenAgentSelector }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-title">
          <span>SBC Agents</span>
          <button className="dropdown-button" onClick={onOpenAgentSelector}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="header-right">
        <button className="share-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 6L12 2L8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 2V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Share</span>
        </button>
        <button className="menu-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="6" r="1" fill="currentColor" />
            <circle cx="12" cy="18" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
