import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AgentProvider } from './contexts/AgentContext'
import { ChatProvider } from './contexts/ChatContext'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AgentProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </AgentProvider>
    </AuthProvider>
  </React.StrictMode>
)
