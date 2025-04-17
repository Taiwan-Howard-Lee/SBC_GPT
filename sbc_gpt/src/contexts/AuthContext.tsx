import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  sessionId: string | null;
  login: (sessionId: string) => void;
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
      const storedSessionId = localStorage.getItem('sessionId');
      console.log('Checking authentication, sessionId exists:', !!storedSessionId);

      if (storedSessionId) {
        try {
          console.log('Validating session with backend...');
          const response = await fetch('http://localhost:3001/api/auth/validate', {
            headers: {
              'Authorization': storedSessionId
            }
          });

          const data = await response.json();

          if (data.success) {
            setIsAuthenticated(true);
            setSessionId(storedSessionId);
          } else {
            // Invalid session, clear localStorage
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('Auth validation error:', error);
          // Don't clear session on network errors to allow offline usage
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (newSessionId: string) => {
    setSessionId(newSessionId);
    setIsAuthenticated(true);
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
