import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Modal from './Modal';
import { Globe, User, Shield, LogOut, Info, Download, Moon, Sun } from 'lucide-react';

const Settings = ({ isOpen, onClose, onInstallApp, canInstall }) => {
    const { currentUser, logout } = useAuth();
    const { currentLanguage, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('settingsTitle')}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Language Selection */}
                <div style={{
                    padding: '1rem',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                }}>
                    <h4 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        <Globe size={16} />
                        {t('language')}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`btn ${currentLanguage === 'en' ? 'btn-primary' : ''}`}
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                padding: '0.5rem',
                                background: currentLanguage === 'en' ? '' : 'var(--bg-glass)',
                                border: currentLanguage === 'en' ? '' : '1px solid var(--border)'
                            }}
                        >
                            English
                        </button>
                        <button
                            onClick={() => setLanguage('es')}
                            className={`btn ${currentLanguage === 'es' ? 'btn-primary' : ''}`}
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                padding: '0.5rem',
                                background: currentLanguage === 'es' ? '' : 'var(--bg-glass)',
                                border: currentLanguage === 'es' ? '' : '1px solid var(--border)'
                            }}
                        >
                            Español
                        </button>
                    </div>
                </div>

                {/* Theme Selection */}
                <div style={{
                    padding: '1rem',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                }}>
                    <h4 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        {t('theme')}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            onClick={() => setTheme('light')}
                            className={`btn ${theme === 'light' ? 'btn-primary' : ''}`}
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                padding: '0.5rem',
                                background: theme === 'light' ? '' : 'var(--bg-glass)',
                                border: theme === 'light' ? '' : '1px solid var(--border)'
                            }}
                        >
                            <Sun size={14} /> {t('light')}
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`}
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                padding: '0.5rem',
                                background: theme === 'dark' ? '' : 'var(--bg-glass)',
                                border: theme === 'dark' ? '' : '1px solid var(--border)'
                            }}
                        >
                            <Moon size={14} /> {t('dark')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Info */}
            <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
            }}>
                <h4 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600
                }}>
                    <User size={16} />
                    {t('accountInfo')}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('username')}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{currentUser?.username}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('accountType')}</span>
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            background: currentUser?.isMaster ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            color: currentUser?.isMaster ? 'var(--primary)' : 'var(--text-muted)',
                            borderRadius: '1rem',
                            border: currentUser?.isMaster ? '1px solid var(--primary-glow)' : '1px solid var(--border)'
                        }}>
                            <Shield size={12} />
                            {currentUser?.isMaster ? t('masterAccount') : t('regularAccount')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('accountId')}</span>
                        <code style={{
                            fontSize: '0.75rem',
                            color: 'var(--primary)',
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px'
                        }}>
                            {currentUser?.accountId}
                        </code>
                    </div>
                </div>
            </div>

            {/* PWA Download */}
            {canInstall && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--primary-glow)'
                }}>
                    <h4 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--primary)'
                    }}>
                        <Download size={16} />
                        {t('installApp')}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Accede más rápido instalando EcclesiaSync en tu dispositivo.
                    </p>
                    <button
                        onClick={onInstallApp}
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}
                    >
                        {t('installButton')}
                    </button>
                </div>
            )}

            {/* Biography / About */}
            <div style={{
                marginBottom: '2rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
            }}>
                <h4 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 600
                }}>
                    <Info size={16} />
                    {t('aboutTitle')}
                </h4>
                <p style={{
                    fontSize: '0.75rem',
                    lineHeight: '1.5',
                    color: 'var(--text-muted)',
                    textAlign: 'justify',
                    fontStyle: 'italic'
                }}>
                    {t('aboutBio')}
                </p>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="btn btn-danger"
                style={{ width: '100%', justifyContent: 'center' }}
            >
                <LogOut size={18} />
                {t('logout')}
            </button>
        </Modal>
    );
};

export default Settings;
