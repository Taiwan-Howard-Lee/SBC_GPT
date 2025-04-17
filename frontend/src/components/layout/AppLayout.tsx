import React, { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { AgentSelector } from '../agents';
import { Modal } from '../common';
import { useAgentContext } from '../../contexts/AgentContext';

import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    agents,
    isAgentSelectorOpen,
    setIsAgentSelectorOpen,
    selectedAgentIds,
    handleAgentSelect,
    handleAgentDeselect,
    toggleAgentSelector
  } = useAgentContext();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header onOpenAgentSelector={toggleAgentSelector} />
        <div className="content-area">
          {children}
        </div>
      </div>

      <Modal
        isOpen={isAgentSelectorOpen}
        onClose={() => setIsAgentSelectorOpen(false)}
      >
        <AgentSelector
          agents={agents}
          selectedAgents={selectedAgentIds}
          onAgentSelect={handleAgentSelect}
          onAgentDeselect={handleAgentDeselect}
        />
      </Modal>
    </div>
  );
};

export default AppLayout;
