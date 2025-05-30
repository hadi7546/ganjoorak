import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      style={{
        padding: '0.5rem 1rem',
        border: '1px solid rgb(var(--foreground-rgb))', // Use themed border
        borderRadius: '0.375rem', // Equivalent to Tailwind's rounded-md
        backgroundColor: 'transparent', // Make background transparent
        color: 'rgb(var(--foreground-rgb))', // Use themed text color
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(var(--foreground-rgb), 0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    </button>
  );
};

export default ThemeToggleButton;
