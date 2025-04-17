import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuthContext } from '../../contexts/AuthContext';
import './Header.css';

interface HeaderProps {
  onOpenAgentSelector: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenAgentSelector }) => {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  const handleAdminEntry = () => {
    navigate('/admin-login');
  };

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
        <button className="admin-button" onClick={handleAdminEntry} title="Admin Access">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Elites Entry</span>
        </button>
        <button className="logout-button" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Logout</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
