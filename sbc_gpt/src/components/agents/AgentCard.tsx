import React from 'react';
import { Agent } from './types';
import './AgentCard.css';

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onSelect }) => {
  // Check if this is the Central Router (always selected and can't be deselected)
  const isCentralRouter = agent.id === 'central-router';
  const isDisabled = isCentralRouter && isSelected;

  return (
    <div
      className={`agent-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={() => !isDisabled && onSelect(agent.id)}
      style={{
        '--agent-color': agent.color
      } as React.CSSProperties}
    >
      <div className="agent-icon">
        <i className={agent.icon}></i>
      </div>
      <div className="agent-info">
        <h3 className="agent-name">{agent.name}</h3>
        <p className="agent-description">{agent.description}</p>
        {agent.source && (
          <div className="agent-source">
            <span>Source:</span> {agent.source}
          </div>
        )}
      </div>
      <div className="agent-status">
        {!agent.isActive ? (
          <span className="status-offline">
            <i className="far fa-circle"></i> Offline
          </span>
        ) : agent.status === 'processing' ? (
          <span className="status-processing">
            <i className="fas fa-spinner fa-spin"></i> Processing
          </span>
        ) : agent.status === 'error' ? (
          <span className="status-error">
            <i className="fas fa-exclamation-circle"></i> Error
          </span>
        ) : agent.status === 'idle' ? (
          <span className="status-idle">
            <i className="fas fa-circle"></i> Ready
          </span>
        ) : (
          <span className="status-offline">
            <i className="far fa-circle"></i> Offline
          </span>
        )}
      </div>
    </div>
  );
};

export default AgentCard;
