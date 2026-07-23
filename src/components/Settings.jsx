import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useStorage } from '../context/StorageContext';
import Modal from './Modal';
import {
    Globe, User, Shield, LogOut, Info, Download, Moon, Sun,
    Eye, EyeOff, Lock, Unlock, Trash2, Users, RefreshCw,
    Bell, Send, CheckCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import notificationService from '../utils/NotificationService';

const Settings = ({ isOpen, onClose }) => {
    const { 
        currentUser, logout, users, fetchUsers, 
        toggleBlockUser, deleteUser, joinAccount, updateMembershipRole,
        updateProfile, leaveAccount, createChurch, activeAccountId
    } = useAuth();

    const { templates, members, services } = useStorage();
    const { currentLanguage, setLanguage, t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [joinId, setJoinId] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [loadingAction, setLoadingAction] = useState(null);
    const [churchNames, setChurchNames] = useState({});

    // Notification Control State
    const [notifPermission, setNotifPermission] = useState('checking');
    const [syncMessage, setSyncMessage] = useState('');
    const [testLoading, setTestLoading] = useState(false);

    const updatePermissionStatus = async () => {
        const status = await notificationService.checkPermissionStatus();
        setNotifPermission(status);
    };

    useEffect(() => {
        if (isOpen) {
            updatePermissionStatus();
        }
    }, [isOpen]);

    const handleRequestPermission = async () => {
        const granted = await notificationService.requestPermissions();
        await updatePermissionStatus();
        if (granted) {
            setSyncMessage('✅ Permisos concedidos correctamente');
        } else {
            setSyncMessage('⚠️ Permisos denegados por el sistema');
        }
        setTimeout(() => setSyncMessage(''), 4000);
    };

    const handleTestNotification = async () => {
        setTestLoading(true);
        setSyncMessage('');
        await notificationService.sendLocalNotification(
            Date.now(),
            '🔔 Prueba de Notificación',
            '¡Las notificaciones de VerbumSync están funcionando perfectamente en tu dispositivo!'
        );
        setTestLoading(false);
        setSyncMessage('📱 Notificación de prueba emitida');
        setTimeout(() => setSyncMessage(''), 4000);
    };

    const handleSyncAlarms = async () => {
        setSyncMessage('⏳ Sincronizando notificaciones...');
        const result = await notificationService.syncAllLocalNotifications(currentUser, services, members, templates, users || []);
        if (result.status === 'success') {
            setSyncMessage(`🚀 ${result.scheduledCount} notificaciones programadas en Android.`);
        } else if (result.status === 'skipped_web') {
            setSyncMessage('ℹ️ Modo Web: Las notificaciones responden a eventos en tiempo real.');
        } else {
            setSyncMessage(`⚠️ Estado: ${result.status}`);
        }
        setTimeout(() => setSyncMessage(''), 5000);
    };

    const fetchChurchNames = async () => {
        try {
            const { data, error } = await supabase
                .from('templates')
                .select('account_id, custom_fields')
                .eq('name', '__church_metadata__');

            if (!error && data) {
                const mapping = {};
                data.forEach(item => {
                    const nameField = item.custom_fields?.find(f => f.startsWith('__church_name:'));
                    if (nameField) {
                        mapping[item.account_id] = nameField.replace('__church_name:', '');
                    }
                });
                setChurchNames(mapping);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchChurchNames();
        }
    }, [isOpen, currentUser]);

    const [birthday, setBirthday] = useState(currentUser?.birthday || '');
    const [address, setAddress] = useState(currentUser?.address || '');
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setBirthday(currentUser.birthday || '');
            setAddress(currentUser.address || '');
        }
    }, [currentUser]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaveLoading(true);
        setSaveSuccess(false);
        const res = await updateProfile(birthday, address);
        setSaveLoading(false);
        if (res.success) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } else {
            alert('Error al guardar el perfil: ' + res.error);
        }
    };

    const triggerTestNotification = async (id, title, body, extra) => {
        await notificationService.sendLocalNotification(id, title, body, null, extra);
        try {
            // Find active membership to determine accountId
            const activeMembership = currentUser?.memberships?.find(m => m.id === activeAccountId) || currentUser?.memberships?.[0];
            const accId = activeMembership?.id || currentUser?.accountId || activeAccountId;
            if (accId) {
                const channelId = `room-${accId}`;
                const channel = supabase.channel(channelId);
                await channel.send({
                    type: 'broadcast',
                    event: 'test_notification',
                    payload: { id, title, body, extra }
                });
                console.log(`📡 Broadcasted test notification to channel ${channelId}`);
            }
        } catch (e) {
            console.error('Failed to broadcast test notification:', e);
        }
    };

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
            onClose(); // Close settings to see the new account
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', marginTop: '0.25rem' }}>
                        <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, display: 'block' }}>🔑 Tu 2º ID (Código de Miembro):</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', color: '#fff' }}>{currentUser?.userCode || 'EC-MAIN'}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (currentUser?.userCode) {
                                    navigator.clipboard.writeText(currentUser.userCode);
                                    setSyncMessage('📋 2º ID copiado al portapapeles');
                                    setTimeout(() => setSyncMessage(''), 3000);
                                }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                            Copiar 2º ID
                        </button>
                    </div>
                </div>

                {/* List of Churches / Memberships */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Mis Iglesias / Congregaciones</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {currentUser?.memberships?.map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block' }}>
                                        {churchNames[m.id] || 'Iglesia Adventista Sin Nombre'}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                        Código: {m.id} | Rol: {m.role}
                                    </span>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`¿Estás seguro de que quieres salirte de la iglesia adventista "${churchNames[m.id] || m.id}"?`)) {
                                            setLoadingAction(m.id + '_leave');
                                            const res = await leaveAccount(m.id);
                                            setLoadingAction(null);
                                            if (res.success) {
                                                fetchChurchNames();
                                            } else {
                                                alert('Error al salir de la iglesia: ' + res.error);
                                            }
                                        }
                                    }}
                                    disabled={loadingAction === m.id + '_leave'}
                                    className="btn btn-danger"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                    {loadingAction === m.id + '_leave' ? '...' : 'Salir'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Join & Create Church options (Only visible if user leaves or doesn't belong to any church) */}
                {(!currentUser?.memberships || currentUser.memberships.length === 0) && (
                    <>
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

                        {/* Create New Church Option */}
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>⛪ Crear Nueva Iglesia Adventista</label>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Registra una nueva congregación adventista y obtén su código de iglesia único.
                                </p>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const name = e.target.churchName.value.trim();
                                    if (!name) return;
                                    
                                    setLoadingAction('create_church');
                                    const res = await createChurch(name);
                                    setLoadingAction(null);
                                    if (res.success) {
                                        e.target.reset();
                                        fetchChurchNames();
                                        alert('¡Iglesia Adventista creada con éxito!');
                                    } else {
                                        alert('Error al crear iglesia adventista: ' + res.error);
                                    }
                                }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            name="churchName"
                                            className="glass-input"
                                            placeholder="Nombre de la Iglesia Adventista"
                                            required
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}
                                        />
                                        <button type="submit" disabled={loadingAction === 'create_church'} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                            {loadingAction === 'create_church' ? '...' : 'Crear'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </div>



            {/* ─── TEAM: Organization Management ────────────────────────────── */}
            {currentUser?.username?.toLowerCase() === 'keylet' && (
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





            {/* Motor de Notificaciones */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                    🔔 Motor de Notificaciones
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                    Sincroniza y prueba el envío instantáneo de alertas en Android (sonido, vibración y aviso en pantalla).
                </p>
                <button
                    type="button"
                    onClick={async () => {
                        await notificationService.sendInstantTestNotification();
                        alert('¡Notificación de prueba enviada! Revisa la barra superior de tu dispositivo.');
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem', justifyContent: 'center' }}
                >
                    🔔 Enviar Notificación de Prueba
                </button>
            </div>

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
