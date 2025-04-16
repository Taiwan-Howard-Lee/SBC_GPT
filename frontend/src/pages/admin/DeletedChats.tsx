import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './DeletedChats.css';

interface DeletedChat {
  feedback_id: string;
  chatId: string;
  title: string;
  rating: number;
  comments: string;
  createdAt: string;
}

const DeletedChats: React.FC = () => {
  const [chats, setChats] = useState<DeletedChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDeletedChats();
      setChats(data);
      setError('');
    } catch (err) {
      setError('Failed to load deleted chats');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchChats();
  }, []);
  
  // Render stars for rating
  const renderRating = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : 'empty'}`}>
        ★
      </span>
    ));
  };
  
  return (
    <div className="deleted-chats">
      <div className="chats-header">
        <h2>Deleted Chats ({chats.length})</h2>
        <button className="refresh-button" onClick={fetchChats}>
          Refresh
        </button>
      </div>
      
      {isLoading ? (
        <div className="loading">Loading chats...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <table className="chats-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Rating</th>
              <th>Feedback</th>
              <th>Deleted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chats.map(chat => (
              <tr key={chat.feedback_id}>
                <td className="chat-id">{chat.chatId.substring(0, 8)}...</td>
                <td>{chat.title || 'Untitled'}</td>
                <td className="rating">{renderRating(chat.rating)}</td>
                <td className="feedback">
                  {chat.comments ? 
                    (chat.comments.length > 50 ? 
                      `${chat.comments.substring(0, 50)}...` : 
                      chat.comments) : 
                    'No comments'}
                </td>
                <td>{new Date(chat.createdAt).toLocaleString()}</td>
                <td>
                  <button className="view-button">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {!isLoading && !error && chats.length === 0 && (
        <div className="no-chats">No deleted chats found</div>
      )}
    </div>
  );
};

export default DeletedChats;
