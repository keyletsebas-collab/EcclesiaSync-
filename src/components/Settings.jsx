import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import { Globe, User, Shield, LogOut, Info, Download } from 'lucide-react';

const Settings = ({ isOpen, onClose, onInstallApp, canInstall }) => {
    const { currentUser, logout } = useAuth();
    const { currentLanguage, setLanguage, t } = useLanguage();

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('settingsTitle')}>
            {/* Language Selection */}
            {/* ... same as before ... */}

            {/* Account Info */}
            <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
            }}>
                {/* ... existing account info content ... */}
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
