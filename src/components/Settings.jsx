import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Modal from './Modal';
import {
    Globe, User, Shield, LogOut, Info, Download, Moon, Sun,
    Eye, EyeOff, Lock, Unlock, Trash2, Users, RefreshCw
} from 'lucide-react';

const Settings = ({ isOpen, onClose, onInstallApp, canInstall }) => {
    const { currentUser, logout, users, fetchUsers, toggleBlockUser, deleteUser } = useAuth();
    const { currentLanguage, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [loadingAction, setLoadingAction] = useState(null);

    useEffect(() => {
        if (isOpen && currentUser?.isMaster) {
            fetchUsers();
        }
    }, [isOpen]);

    const handleLogout = () => {
        logout();
        onClose();
    };

    const togglePasswordVisibility = (uid) => {
        setVisiblePasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
    };

    const handleBlock = async (uid, isBlocked) => {
        setLoadingAction(uid + '_block');
        await toggleBlockUser(uid, isBlocked);
        setLoadingAction(null);
    };

    const handleDelete = async (uid) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
        setLoadingAction(uid + '_delete');
        await deleteUser(uid);
        setLoadingAction(null);
    };

    // Filtered list: don't show the current master themselves
    const otherUsers = users.filter(u => u.uid !== currentUser?.uid);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('settingsTitle')}>

            {/* Language & Theme grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Language */}
                <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        <Globe size={16} />{t('language')}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {['en', 'es'].map(lang => (
                            <button key={lang} onClick={() => setLanguage(lang)}
                                className={`btn ${currentLanguage === lang ? 'btn-primary' : ''}`}
                                style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem', padding: '0.5rem', background: currentLanguage === lang ? '' : 'var(--bg-glass)', border: currentLanguage === lang ? '' : '1px solid var(--border)' }}>
                                {lang === 'en' ? 'English' : 'Español'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Theme */}
                <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}{t('theme')}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {['light', 'dark'].map(th => (
                            <button key={th} onClick={() => setTheme(th)}
                                className={`btn ${theme === th ? 'btn-primary' : ''}`}
                                style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem', padding: '0.5rem', background: theme === th ? '' : 'var(--bg-glass)', border: theme === th ? '' : '1px solid var(--border)' }}>
                                {th === 'light' ? <><Sun size={14} /> {t('light')}</> : <><Moon size={14} /> {t('dark')}</>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Account Info */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    <User size={16} />{t('accountInfo')}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('username')}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{currentUser?.username}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('accountType')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: currentUser?.isMaster ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-glass)', color: currentUser?.isMaster ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '1rem', border: currentUser?.isMaster ? '1px solid var(--primary-glow)' : '1px solid var(--border)' }}>
                            <Shield size={12} />
                            {currentUser?.isMaster ? t('masterAccount') : t('regularAccount')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('accountId')}</span>
                        <code style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            {currentUser?.accountId}
                        </code>
                    </div>
                </div>
            </div>

            {/* ─── MASTER: User Management ────────────────────────────── */}
            {currentUser?.isMaster && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                            <Users size={16} />
                            Gestión de Usuarios
                        </h4>
                        <button
                            onClick={() => fetchUsers()}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                            title="Actualizar lista"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {otherUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            No hay otros usuarios registrados
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {otherUsers.map(user => (
                                <div key={user.uid} style={{
                                    padding: '0.875rem 1rem',
                                    background: user.isBlocked
                                        ? 'rgba(239,68,68,0.06)'
                                        : 'var(--bg-glass)',
                                    borderRadius: 'var(--radius)',
                                    border: user.isBlocked
                                        ? '1px solid rgba(239,68,68,0.3)'
                                        : '1px solid var(--border)',
                                    transition: 'all 0.2s'
                                }}>
                                    {/* Top row: username + badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.username}</span>
                                            {user.isMaster && (
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', borderRadius: '1rem', border: '1px solid var(--primary-glow)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                    <Shield size={9} /> Master
                                                </span>
                                            )}
                                        </div>
                                        {/* Status badge */}
                                        <span style={{
                                            fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600,
                                            background: user.isBlocked ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                            color: user.isBlocked ? '#ef4444' : '#22c55e',
                                            border: user.isBlocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.3)'
                                        }}>
                                            {user.isBlocked ? '🔒 Bloqueado' : '✓ Activo'}
                                        </span>
                                    </div>

                                    {/* Password row */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Contraseña</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <code style={{
                                                fontSize: '0.75rem', fontFamily: 'monospace',
                                                background: 'var(--input-bg)', padding: '0.15rem 0.5rem',
                                                borderRadius: '4px', color: 'var(--text-main)', border: '1px solid var(--border)',
                                                letterSpacing: visiblePasswords[user.uid] ? 'normal' : '0.1em'
                                            }}>
                                                {visiblePasswords[user.uid] ? user.password : '••••••••'}
                                            </code>
                                            <button
                                                onClick={() => togglePasswordVisibility(user.uid)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', display: 'flex', alignItems: 'center' }}
                                                title={visiblePasswords[user.uid] ? 'Ocultar' : 'Mostrar'}
                                            >
                                                {visiblePasswords[user.uid] ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleBlock(user.uid, !user.isBlocked)}
                                            disabled={loadingAction === user.uid + '_block'}
                                            style={{
                                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                                fontSize: '0.75rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius)',
                                                border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                                                background: user.isBlocked ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                                                color: user.isBlocked ? '#22c55e' : '#ef4444',
                                                opacity: loadingAction === user.uid + '_block' ? 0.5 : 1
                                            }}
                                        >
                                            {user.isBlocked ? <><Unlock size={12} /> Desbloquear</> : <><Lock size={12} /> Bloquear</>}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.uid)}
                                            disabled={loadingAction === user.uid + '_delete'}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                                                fontSize: '0.75rem', padding: '0.4rem 0.7rem', borderRadius: 'var(--radius)',
                                                border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 600,
                                                background: 'transparent', color: '#ef4444', transition: 'all 0.2s',
                                                opacity: loadingAction === user.uid + '_delete' ? 0.5 : 1
                                            }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* PWA Download */}
            {canInstall && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)', borderRadius: 'var(--radius)', border: '1px solid var(--primary-glow)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                        <Download size={16} />{t('installApp')}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Accede más rápido instalando EcclesiaSync en tu dispositivo.
                    </p>
                    <button onClick={onInstallApp} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}>
                        {t('installButton')}
                    </button>
                </div>
            )}

            {/* About */}
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    <Info size={16} />{t('aboutTitle')}
                </h4>
                <p style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'var(--text-muted)', textAlign: 'justify', fontStyle: 'italic' }}>
                    {t('aboutBio')}
                </p>
            </div>

            {/* Logout */}
            <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
                <LogOut size={18} />{t('logout')}
            </button>
        </Modal>
    );
};

export default Settings;
