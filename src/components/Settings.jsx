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
    const { 
        currentUser, logout, users, fetchUsers, 
        toggleBlockUser, deleteUser, joinAccount, updateMembershipRole 
    } = useAuth();
    const { currentLanguage, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [joinId, setJoinId] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);
    const [joinError, setJoinError] = useState('');
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

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinId.trim()) return;
        setJoinLoading(true);
        setJoinError('');
        const res = await joinAccount(joinId.trim().toUpperCase());
        setJoinLoading(false);
        if (res.success) {
            setJoinId('');
            alert('¡Unido con éxito!');
        } else {
            setJoinError(res.error);
        }
    };

    const handlePromote = async (targetUid, currentRole) => {
        const newRole = currentRole === 'master' ? 'editor' : 'master';
        const expiresAt = newRole === 'master' ? new Date(Date.now() + 3600000 * 24).toISOString() : null; // 24h for temp master
        setLoadingAction(targetUid + '_promote');
        await updateMembershipRole(targetUid, currentUser.accountId, newRole, expiresAt);
        await fetchUsers();
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
                </div>

                {/* Join New Account */}
                <form onSubmit={handleJoin} style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('joinNewAccount')}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="CODE-123" 
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            style={{ flex: 1, fontSize: '0.875rem' }}
                        />
                        <button type="submit" disabled={joinLoading} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                            {joinLoading ? '...' : '+'}
                        </button>
                    </div>
                    {joinError && <p style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '0.4rem' }}>{joinError}</p>}
                </form>
            </div>

            {/* ─── TEAM: Organization Management ────────────────────────────── */}
            {(currentUser?.isMaster || currentUser?.memberships?.find(m => m.id === currentUser.accountId && m.role === 'master')) && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                            <Users size={16} />
                            {t('manageMembers')}
                        </h4>
                        <button
                            onClick={() => fetchUsers()}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                            title="Actualizar lista"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {otherUsers.filter(u => u.accountId === currentUser.accountId).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            No hay otros miembros en este equipo
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {otherUsers.filter(u => u.accountId === currentUser.accountId).map(user => {
                                const m = user.memberships?.find(m => m.id === currentUser.accountId);
                                return (
                                    <div key={user.uid} style={{
                                        padding: '0.875rem 1rem',
                                        background: user.isBlocked ? 'rgba(239,68,68,0.06)' : 'var(--bg-glass)',
                                        borderRadius: 'var(--radius)',
                                        border: user.isBlocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.username}</span>
                                            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                                                {m?.role || 'editor'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handlePromote(user.uid, m?.role)}
                                                disabled={loadingAction === user.uid + '_promote'}
                                                style={{ flex: 1, fontSize: '0.7rem', padding: '0.3rem', borderRadius: '4px', background: 'var(--primary)', color: 'white', border: 'none' }}
                                            >
                                                {m?.role === 'master' ? 'Quitar Master' : 'Hacer Master (24h)'}
                                            </button>
                                            <button onClick={() => handleDelete(user.uid)} className="btn-danger" style={{ padding: '0.3rem', borderRadius: '4px' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
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
                        Accede más rápido instalando LuminaSync en tu dispositivo.
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
