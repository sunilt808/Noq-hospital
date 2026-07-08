// src/components/ThemeToggle.jsx - Theme switcher button

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { themeService } from '../services/notificationService';

const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    setTheme(themeService.getCurrentTheme());
  }, []);

  const handleToggle = () => {
    const newTheme = themeService.toggleTheme();
    setTheme(newTheme);
  };

  return (
    <button
      onClick={handleToggle}
      style={{
        background: 'none',
        border: 'none',
        fontSize: '18px',
        cursor: 'pointer',
        color: '#6b7280',
        padding: '8px 12px',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
    </button>
  );
};

export default ThemeToggle;
