import React from 'react';
import AppLayout from './components/layout/AppLayout';
import ChatContainer from './components/chat/ChatContainer';
import './App.css';

const App: React.FC = () => {
  return (
    <AppLayout>
      <ChatContainer />
    </AppLayout>
  );
};

export default App;