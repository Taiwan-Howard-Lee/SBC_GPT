import React from 'react';
import './AgentButton.css';

interface AgentButtonProps {
  selectedCount: number;
  totalCount: number;
  onClick: () => void;
}

const AgentButton: React.FC<AgentButtonProps> = ({ selectedCount, totalCount, onClick }) => {
  return (
    <button className="agent-button" onClick={onClick}>
      <div className="agent-button-icon">
        <i className="fas fa-robot"></i>
      </div>
      <div className="agent-button-text">
        <span className="agent-count">{selectedCount}/{totalCount}</span>
        <span className="agent-label">Agents</span>
      </div>
    </button>
  );
};

export default AgentButton;
