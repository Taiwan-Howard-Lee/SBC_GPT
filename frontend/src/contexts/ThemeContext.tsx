import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define theme types
export type ThemeMode = 'light' | 'dark';

// Define the context type
interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// Provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Try to get the theme from localStorage, default to light
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as ThemeMode) || 'light';
  });

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Computed property for convenience
  const isDarkMode = themeMode === 'dark';

  // Update localStorage and apply theme class to body when theme changes
  useEffect(() => {
    localStorage.setItem('theme', themeMode);
    
    // Apply theme class to body
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [themeMode, isDarkMode]);

  // Context value
  const value = {
    themeMode,
    toggleTheme,
    isDarkMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
