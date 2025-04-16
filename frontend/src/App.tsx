import React from 'react';
import AppLayout from './components/layout/AppLayout';
import ChatContainer from './components/chat/ChatContainer';
import LoginPage from './components/auth/LoginPage';
import { useAuthContext } from './contexts/AuthContext';
import './App.css';

const App: React.FC = () => {
  const { isAuthenticated, login, isLoading } = useAuthContext();

  // Show loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show main app if authenticated
  return (
    <AppLayout>
      <ChatContainer />
    </AppLayout>
  );
};

export default App;