import React, { useState } from 'react';
import AgentCard from './AgentCard';
import { Agent, AgentId } from './types';
import './AgentSelector.css';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgents: AgentId[];
  onAgentSelect: (agentId: AgentId) => void;
  onAgentDeselect: (agentId: AgentId) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgents,
  onAgentSelect,
  onAgentDeselect,
  onSelectAll,
  onDeselectAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agent.source && agent.source.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAgentClick = (agentId: AgentId) => {
    if (selectedAgents.includes(agentId)) {
      onAgentDeselect(agentId);
    } else {
      onAgentSelect(agentId);
    }
  };

  return (
    <div className="agent-selector">
      <div className="agent-selector-header">
        <h2>Select Agents</h2>
        <div className="agent-selector-actions">
          <button
            className="selector-action-button"
            onClick={onSelectAll}
          >
            Select All
          </button>
          <button
            className="selector-action-button"
            onClick={onDeselectAll}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="agent-search">
        <i className="fas fa-search search-icon"></i>
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button
            className="clear-search-button"
            onClick={() => setSearchTerm('')}
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      <div className="agents-list">
        {filteredAgents.length === 0 ? (
          <div className="no-agents-found">
            <i className="fas fa-search"></i>
            <p>No agents found matching "{searchTerm}"</p>
          </div>
        ) : (
          filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgents.includes(agent.id)}
              onSelect={handleAgentClick}
            />
          ))
        )}
      </div>

      <div className="agent-selector-footer">
        <div className="selected-count">
          {selectedAgents.length} of {agents.length} agents selected
        </div>
      </div>
    </div>
  );
};

export default AgentSelector;
