import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await api.adminLogin(password);
      
      if (result.success) {
        // Store admin token
        localStorage.setItem('adminToken', result.token);
        navigate('/admin');
      } else {
        setError(result.message || 'Invalid admin password');
      }
    } catch (err) {
      setError('Error connecting to server. Please try again.');
      console.error('Admin login error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>SBC GPT Admin</h1>
          <p>Enter admin password to continue</p>
        </div>
        
        <form className="admin-login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="admin-password">Admin Password</label>
            <input
              type="password"
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>
          
          <div className="admin-login-actions">
            <button 
              type="button" 
              className="back-button"
              onClick={() => navigate('/')}
            >
              Back to App
            </button>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
