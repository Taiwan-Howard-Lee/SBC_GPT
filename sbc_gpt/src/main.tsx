import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AgentProvider } from './contexts/AgentContext'
import { ChatProvider } from './contexts/ChatContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AgentProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </AgentProvider>
  </React.StrictMode>
)
