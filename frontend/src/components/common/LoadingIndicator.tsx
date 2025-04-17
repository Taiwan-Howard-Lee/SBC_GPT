import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`loading-indicator ${className}`}>
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
    </div>
  );
};

export default LoadingIndicator;
