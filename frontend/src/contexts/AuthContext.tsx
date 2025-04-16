import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  sessionId: string | null;
  login: (password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isValid = await api.validateSession();
        setIsAuthenticated(isValid);
        setSessionId(isValid ? localStorage.getItem('sessionId') : null);
      } catch (error) {
        console.error('Auth validation error:', error);
        // Don't clear session on network errors to allow offline usage
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (password: string) => {
    try {
      const response = await api.login(password);
      
      if (response.success && response.sessionId) {
        localStorage.setItem('sessionId', response.sessionId);
        setSessionId(response.sessionId);
        setIsAuthenticated(true);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'An error occurred during login. Please try again.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('sessionId');
    setSessionId(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    sessionId,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
