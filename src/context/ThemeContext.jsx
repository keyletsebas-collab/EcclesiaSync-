import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('app_theme');
        return saved || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('app_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        // Also update body class for easier styling if needed
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const value = {
        theme,
        setTheme,
        toggleTheme
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
