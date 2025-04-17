import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AgentId, AgentStatus } from '../components/agents/types';
import { availableAgents as initialAgents } from '../data/agents';

interface AgentContextType {
  agents: typeof initialAgents;
  selectedAgentIds: AgentId[];
  setSelectedAgentIds: React.Dispatch<React.SetStateAction<AgentId[]>>;
  isAgentSelectorOpen: boolean;
  setIsAgentSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAgentSelect: (agentId: AgentId) => void;
  handleAgentDeselect: (agentId: AgentId) => void;
  handleSelectAllAgents: () => void;
  handleDeselectAllAgents: () => void;
  toggleAgentSelector: () => void;
  updateAgentStatus: (agentId: AgentId, status: AgentStatus) => void;
  resetAgentStatuses: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
};

interface AgentProviderProps {
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  // State for agents with their statuses
  const [agents, setAgents] = useState([...initialAgents]);

  // Always include central-router and notion-agent in the selection
  // These are the only two agents available now
  const [selectedAgentIds, setSelectedAgentIds] = useState<AgentId[]>(['central-router', 'notion-agent']);
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);

  // Update the status of a specific agent
  const updateAgentStatus = useCallback((agentId: AgentId, status: AgentStatus) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status } : agent
      )
    );
  }, []);

  // Reset all agent statuses to idle (except offline ones)
  const resetAgentStatuses = useCallback(() => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.isActive ? { ...agent, status: 'idle' } : agent
      )
    );
  }, []);

  const handleAgentSelect = (agentId: AgentId) => {
    setSelectedAgentIds(prev => [...prev, agentId]);
  };

  const handleAgentDeselect = (agentId: AgentId) => {
    // Prevent deselecting either agent since we only have two essential agents
    if (agentId === 'central-router' || agentId === 'notion-agent') return;

    setSelectedAgentIds(prev => prev.filter(id => id !== agentId));
  };

  const handleSelectAllAgents = () => {
    setSelectedAgentIds(agents.map(agent => agent.id));
  };

  const handleDeselectAllAgents = () => {
    // Always keep both agents selected since we only have two
    setSelectedAgentIds(['central-router', 'notion-agent']);
  };

  const toggleAgentSelector = () => {
    setIsAgentSelectorOpen(prev => !prev);
  };

  const value = {
    agents,
    selectedAgentIds,
    setSelectedAgentIds,
    isAgentSelectorOpen,
    setIsAgentSelectorOpen,
    handleAgentSelect,
    handleAgentDeselect,
    handleSelectAllAgents,
    handleDeselectAllAgents,
    toggleAgentSelector,
    updateAgentStatus,
    resetAgentStatuses
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};

export default AgentContext;
