import React, { createContext, useContext, useEffect } from 'react';

export type AppTheme = 'light';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: AppTheme = 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('bunk_theme', 'light');
  }, []);

  const setTheme = () => {
    // Standardized to high-visibility Bharat Petroleum White Theme
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        setTheme,
        isDark: false
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
