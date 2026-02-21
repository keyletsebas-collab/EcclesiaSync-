import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
    return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        const saved = localStorage.getItem('app_language');
        return saved || 'en';
    });

    useEffect(() => {
        localStorage.setItem('app_language', currentLanguage);
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
