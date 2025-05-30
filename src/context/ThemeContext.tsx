"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface ThemeContextProps {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const getInitialTheme = (): string => {
  if (typeof window === 'undefined') {
    // If window is not defined (e.g., during SSR or build), default to 'light'
    // The actual theme will be applied client-side once window is available
    return 'light';
  }
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
    return storedTheme;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    return 'dark';
  }
  return 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<string>(getInitialTheme);

  // Effect to run when theme changes to update documentElement class and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    // Persist theme in localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
