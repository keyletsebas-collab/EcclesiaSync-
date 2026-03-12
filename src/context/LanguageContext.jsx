import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
    return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
    const appName = 'LuminaSync'; // Define appName here
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        const saved = localStorage.getItem(`${appName}_language`); // Use appName in the key
        return saved || 'en';
    });

    useEffect(() => {
        localStorage.setItem(`${appName}_language`, currentLanguage); // Use appName in the key
    }, [currentLanguage]);

    const t = (key) => {
        return translations[currentLanguage][key] || key;
    };

    const value = {
        currentLanguage,
        setLanguage: setCurrentLanguage,
        t
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
