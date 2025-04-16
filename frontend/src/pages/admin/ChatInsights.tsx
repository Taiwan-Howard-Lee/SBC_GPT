import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './ChatInsights.css';

interface Insights {
  totalChats: number;
  activeChats: number;
  deletedChats: number;
  averageRating: number;
  totalFeedback: number;
  feedbackRate: number;
  ratingDistribution: Record<number, number>;
  recentFeedback: Array<{
    id: string;
    chatId: string;
    rating: number;
    comments: string;
    createdAt: string;
  }>;
}

const ChatInsights: React.FC = () => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      const data = await api.getChatInsights();
      setInsights(data);
      setError('');
    } catch (err) {
      setError('Failed to load insights');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInsights();
  }, []);
  
  // Render trend indicator
  const renderRating = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : 'empty'}`}>
        ★
      </span>
    ));
  };
  
  if (isLoading) return <div className="loading">Loading insights...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!insights) return <div className="error">No data available</div>;
  
  return (
    <div className="chat-insights">
      <div className="insights-header">
        <h2>Chat Insights</h2>
        <button className="refresh-button" onClick={fetchInsights}>
          Refresh
        </button>
      </div>
      
      <div className="stats-overview">
        <div className="stats-card">
          <h3>Total Chats</h3>
          <div className="stat-value">{insights.totalChats}</div>
        </div>
        <div className="stats-card">
          <h3>Active Chats</h3>
          <div className="stat-value">{insights.activeChats}</div>
        </div>
        <div className="stats-card">
          <h3>Deleted Chats</h3>
          <div className="stat-value">{insights.deletedChats}</div>
        </div>
        <div className="stats-card">
          <h3>Average Rating</h3>
          <div className="stat-value">{insights.averageRating.toFixed(1)}</div>
        </div>
        <div className="stats-card">
          <h3>Feedback Rate</h3>
          <div className="stat-value">{insights.feedbackRate.toFixed(1)}%</div>
        </div>
      </div>
      
      <div className="rating-distribution">
        <h3>Rating Distribution</h3>
        <div className="rating-bars">
          {[5, 4, 3, 2, 1].map(rating => {
            const count = insights.ratingDistribution[rating] || 0;
            const percentage = insights.totalFeedback > 0 
              ? (count / insights.totalFeedback) * 100 
              : 0;
            
            return (
              <div key={rating} className="rating-bar-container">
                <div className="rating-label">
                  {rating} {rating === 1 ? 'Star' : 'Stars'}
                </div>
                <div className="rating-bar-wrapper">
                  <div 
                    className="rating-bar" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="rating-count">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="feedback-section">
        <h3>Recent Feedback</h3>
        {insights.recentFeedback.length === 0 ? (
          <div className="no-feedback">No feedback available</div>
        ) : (
          <div className="feedback-list">
            {insights.recentFeedback.map(item => (
              <div key={item.id} className="feedback-item">
                <div className="feedback-header">
                  <div className="feedback-rating">
                    {renderRating(item.rating)}
                  </div>
                  <div className="feedback-date">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="feedback-text">
                  {item.comments || 'No comments provided'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInsights;
