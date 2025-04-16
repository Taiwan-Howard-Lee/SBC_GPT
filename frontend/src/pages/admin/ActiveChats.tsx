import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './ActiveChats.css';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const ActiveChats: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getActiveChats();
      setChats(data);
      setError('');
    } catch (err) {
      setError('Failed to load active chats');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchChats();
  }, []);
  
  return (
    <div className="active-chats">
      <div className="chats-header">
        <h2>Active Chats ({chats.length})</h2>
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
              <th>Created</th>
              <th>Updated</th>
              <th>Messages</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chats.map(chat => (
              <tr key={chat.id}>
                <td className="chat-id">{chat.id.substring(0, 8)}...</td>
                <td>{chat.title}</td>
                <td>{new Date(chat.createdAt).toLocaleString()}</td>
                <td>{new Date(chat.updatedAt).toLocaleString()}</td>
                <td>{chat.messageCount}</td>
                <td>
                  <button className="view-button">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {!isLoading && !error && chats.length === 0 && (
        <div className="no-chats">No active chats found</div>
      )}
    </div>
  );
};

export default ActiveChats;
