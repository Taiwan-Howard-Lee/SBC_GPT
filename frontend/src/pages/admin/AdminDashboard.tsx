import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActiveChats from './ActiveChats';
import DeletedChats from './DeletedChats';
import ChatInsights from './ChatInsights';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'deleted' | 'insights'>('active');
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };
  
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>SBC GPT Admin</h1>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Chats
        </button>
        <button 
          className={`tab-button ${activeTab === 'deleted' ? 'active' : ''}`}
          onClick={() => setActiveTab('deleted')}
        >
          Deleted Chats
        </button>
        <button 
          className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Chat Insights
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'active' && <ActiveChats />}
        {activeTab === 'deleted' && <DeletedChats />}
        {activeTab === 'insights' && <ChatInsights />}
      </div>
    </div>
  );
};

export default AdminDashboard;
