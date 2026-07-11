import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, Trash2, Users, Crown, Eye, EyeOff, Key, Clock, Calendar, Check, ShieldAlert } from 'lucide-react';

const AdminsView = () => {
    const { currentUser, activeAccountId, users, fetchUsers, updateMembershipRole, updateUserRole, toggleBlockUser, deleteUser } = useAuth();
    const { t } = useLanguage();
    
    const [visiblePasswords, setVisiblePasswords] = useState({}); // uid -> boolean
    const [editStates, setEditStates] = useState({}); // uid -> { role, durationType, expiresAt }
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [activeAccountId]);

    const togglePasswordVisibility = (uid) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    const handleInitEditState = (user) => {
        if (editStates[user.uid]) return;
        
        const membership = user.memberships?.find(m => m.id === activeAccountId);
        const currentRole = membership ? membership.role : 'remove';
        const currentExpiresAt = membership?.expiresAt ? membership.expiresAt.substring(0, 10) : '';
        const currentDurationType = membership?.expiresAt ? 'limited' : 'indefinite';

        setEditStates(prev => ({
            ...prev,
            [user.uid]: {
                role: currentRole,
                durationType: currentDurationType,
                expiresAt: currentExpiresAt
            }
        }));
    };

    const handleEditChange = (uid, field, value) => {
        setEditStates(prev => ({
            ...prev,
            [uid]: {
                ...prev[uid],
                [field]: value
            }
        }));
    };

    const handleSaveRole = async (user) => {
        const editState = editStates[user.uid];
        if (!editState) return;

        const { role, durationType, expiresAt } = editState;
        let expiresAtIso = null;

        if (role !== 'remove') {
            if (durationType === 'limited' && expiresAt) {
                expiresAtIso = new Date(expiresAt).toISOString();
            }
        }

        try {
            if (role === 'remove') {
                const updatedMemberships = (user.memberships || []).filter(m => m.id !== activeAccountId);
                await updateUserRole(user.uid, { memberships: updatedMemberships });
            } else {
                await updateMembershipRole(user.uid, activeAccountId, role, expiresAtIso);
            }
            
            setSuccessMessage(`Rol de ${user.username} actualizado correctamente.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchUsers();
        } catch (err) {
            console.error('Error saving role:', err);
            alert('Error al guardar el rol del usuario.');
        }
    };

    const handleToggleBlock = async (uid, isBlocked) => {
        try {
            await toggleBlockUser(uid, !isBlocked);
            setSuccessMessage('Estado de bloqueo de usuario actualizado.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDelete = async (uid, username) => {
        if (window.confirm(`¿Estás seguro de eliminar permanentemente la cuenta de ${username}?`)) {
            try {
                await deleteUser(uid);
                setSuccessMessage('Usuario eliminado correctamente.');
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0.5rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                background: 'rgba(15, 23, 42, 0.3)',
                padding: '1.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield size={32} color="var(--primary)" />
                        Gestión de Administradores e Invitados
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Administra los roles, permisos temporales y cuentas de usuario para la iglesia activa: <strong style={{ color: 'var(--primary)' }}>{activeAccountId}</strong>
                    </p>
                </div>
            </header>

            {successMessage && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}>
                    <Check size={18} />
                    {successMessage}
                </div>
            )}

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    fontSize: '1.1rem',
                    fontWeight: 600
                }}>
                    <Users size={20} color="var(--primary)" />
                    Usuarios Registrados en el Sistema ({users.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {users.map(user => {
                        handleInitEditState(user);
                        const editState = editStates[user.uid] || { role: 'remove', durationType: 'indefinite', expiresAt: '' };
                        const isThisUserCurrentUser = user.uid === currentUser?.uid;

                        return (
                            <div key={user.uid} style={{
                                padding: '1.25rem',
                                background: 'rgba(15, 23, 42, 0.4)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                    
                                    {/* User General Info */}
                                    <div style={{ flex: '1 1 300px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>{user.username}</span>
                                            {isThisUserCurrentUser && (
                                                <span style={{
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    color: 'var(--primary)',
                                                    padding: '0.15rem 0.4rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600
                                                }}>
                                                    Tú
                                                </span>
                                            )}
                                            {user.isMaster && (
                                                <span style={{
                                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                                                    color: 'white',
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}>
                                                    <Crown size={10} />
                                                    MASTER GLOBAL
                                                </span>
                                            )}
                                            {user.isBlocked && (
                                                <span style={{
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: '#fca5a5',
                                                    padding: '0.15rem 0.4rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600
                                                }}>
                                                    Bloqueado
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <Key size={12} />
                                                <span>Clave:</span>
                                                <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    {visiblePasswords[user.uid] ? user.password : '••••••••'}
                                                </span>
                                                <button
                                                    onClick={() => togglePasswordVisibility(user.uid)}
                                                    className="btn"
                                                    style={{ 
                                                        padding: '0.25rem 0.6rem', 
                                                        fontSize: '0.75rem', 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.25rem',
                                                        background: 'var(--bg-glass)',
                                                        border: '1px solid var(--border)'
                                                    }}
                                                >
                                                    {visiblePasswords[user.uid] ? (
                                                        <>
                                                            <EyeOff size={12} />
                                                            Ocultar Contraseña
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye size={12} />
                                                            Ver Contraseña
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div>ID Cuenta Primaria: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{user.accountId}</span></div>
                                            <div>Creado el: {new Date(user.createdAt).toLocaleDateString()}</div>
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <span style={{ fontWeight: 600, display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Membresías:</span>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                    {(user.memberships || []).map((m, idx) => (
                                                        <span key={idx} style={{
                                                            background: m.id === activeAccountId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                            border: m.id === activeAccountId ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                            padding: '0.15rem 0.4rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.65rem',
                                                            color: m.role === 'master' ? '#fde047' : '#93c5fd'
                                                        }}>
                                                            📁 {m.id} ({m.role}) {m.expiresAt && `[Expira: ${new Date(m.expiresAt).toLocaleDateString()}]`}
                                                        </span>
                                                    ))}
                                                    {(user.memberships || []).length === 0 && <span style={{ fontStyle: 'italic', fontSize: '0.7rem' }}>Ninguna</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Role Configuration Form for activeAccountId */}
                                    <div style={{
                                        flex: '1 1 350px',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <Shield size={14} color="var(--primary)" />
                                            Ajustes de Rol para {activeAccountId}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {/* Role Selector */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Rol</label>
                                                <select
                                                    className="glass-input"
                                                    style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }}
                                                    value={editState.role}
                                                    onChange={e => handleEditChange(user.uid, 'role', e.target.value)}
                                                >
                                                    <option value="remove">❌ Sin Acceso (Eliminar)</option>
                                                    <option value="viewer">👁️ Viewer (Lectura)</option>
                                                    <option value="editor">✍️ Editor (Escritura)</option>
                                                    <option value="master">👑 Master (Administrador)</option>
                                                </select>
                                            </div>

                                            {/* Duration Type Selector */}
                                            {editState.role !== 'remove' && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Duración</label>
                                                    <select
                                                        className="glass-input"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }}
                                                        value={editState.durationType}
                                                        onChange={e => handleEditChange(user.uid, 'durationType', e.target.value)}
                                                    >
                                                        <option value="indefinite">♾️ Indefinidamente</option>
                                                        <option value="limited">⏱️ Por tiempo limitado</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Datepicker for limited duration */}
                                        {editState.role !== 'remove' && editState.durationType === 'limited' && (
                                            <div className="animate-fade-in">
                                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fecha de Vencimiento</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <Calendar size={14} style={{ position: 'absolute', left: '0.75rem', opacity: 0.6 }} />
                                                    <input
                                                        type="date"
                                                        className="glass-input"
                                                        style={{ padding: '0.4rem 0.4rem 0.4rem 2.2rem', fontSize: '0.8rem', width: '100%' }}
                                                        value={editState.expiresAt}
                                                        onChange={e => handleEditChange(user.uid, 'expiresAt', e.target.value)}
                                                        min={new Date().toISOString().substring(0, 10)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{
                                                    padding: '0.4rem 1rem',
                                                    fontSize: '0.8rem',
                                                    justifyContent: 'center',
                                                    opacity: isThisUserCurrentUser && editState.role !== 'master' ? 0.5 : 1
                                                }}
                                                onClick={() => handleSaveRole(user)}
                                                disabled={isThisUserCurrentUser && editState.role !== 'master'}
                                                title={isThisUserCurrentUser ? "No puedes quitarte el rol de Master a ti mismo" : "Guardar rol"}
                                            >
                                                Guardar Configuración de Rol
                                            </button>

                                            {user.memberships?.some(m => m.id === activeAccountId) ? (
                                                <button
                                                    className="btn btn-danger"
                                                    style={{
                                                        padding: '0.4rem 1rem',
                                                        fontSize: '0.8rem',
                                                        justifyContent: 'center',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        color: '#fca5a5'
                                                    }}
                                                    onClick={async () => {
                                                        const updatedMemberships = (user.memberships || []).filter(m => m.id !== activeAccountId);
                                                        await updateUserRole(user.uid, { memberships: updatedMemberships });
                                                        setSuccessMessage(`Acceso revocado para ${user.username}.`);
                                                        setTimeout(() => setSuccessMessage(''), 3000);
                                                        await fetchUsers();
                                                    }}
                                                    disabled={isThisUserCurrentUser}
                                                    title="Revocar acceso de este usuario a esta iglesia"
                                                >
                                                    ❌ Quitar Acceso a esta Iglesia
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn"
                                                    style={{
                                                        padding: '0.4rem 1rem',
                                                        fontSize: '0.8rem',
                                                        justifyContent: 'center',
                                                        background: 'rgba(16, 185, 129, 0.15)',
                                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                                        color: '#34d399'
                                                    }}
                                                    onClick={async () => {
                                                        await updateMembershipRole(user.uid, activeAccountId, 'viewer', null);
                                                        setSuccessMessage(`Acceso concedido (Viewer) para ${user.username}.`);
                                                        setTimeout(() => setSuccessMessage(''), 3000);
                                                        await fetchUsers();
                                                    }}
                                                    title="Conceder acceso de lectura"
                                                >
                                                    🔓 Dar Acceso a esta Iglesia (Viewer)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Global Administration Buttons (Delete and Block) */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '0.5rem',
                                    borderTop: '1px solid var(--border)',
                                    paddingTop: '0.75rem',
                                    marginTop: '0.25rem'
                                }}>
                                    <button
                                        className="btn"
                                        style={{
                                            padding: '0.4rem 0.75rem',
                                            fontSize: '0.75rem',
                                            background: user.isMaster ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                            border: user.isMaster ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                                            color: user.isMaster ? '#fca5a5' : '#a5b4fc'
                                        }}
                                        onClick={async () => {
                                            if (window.confirm(`¿Estás seguro de ${user.isMaster ? 'quitar' : 'conceder'} permisos de Master Global a ${user.username}?`)) {
                                                await updateUserRole(user.uid, { isMaster: !user.isMaster });
                                                setSuccessMessage(`Rol Master Global actualizado para ${user.username}.`);
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                                await fetchUsers();
                                            }
                                        }}
                                        disabled={isThisUserCurrentUser}
                                    >
                                        <Crown size={14} />
                                        {user.isMaster ? 'Quitar Master Global' : 'Hacer Master Global'}
                                    </button>

                                    <button
                                        className="btn"
                                        style={{
                                            padding: '0.4rem 0.75rem',
                                            fontSize: '0.75rem',
                                            background: user.isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            border: user.isBlocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                            color: user.isBlocked ? '#34d399' : '#fca5a5'
                                        }}
                                        onClick={() => handleToggleBlock(user.uid, user.isBlocked)}
                                        disabled={isThisUserCurrentUser}
                                    >
                                        <ShieldAlert size={14} />
                                        {user.isBlocked ? 'Desbloquear Usuario' : 'Bloquear Usuario Global'}
                                    </button>

                                    <button
                                        className="btn-danger"
                                        style={{
                                            padding: '0.4rem 0.75rem',
                                            fontSize: '0.75rem'
                                        }}
                                        onClick={() => confirmDelete(user.uid, user.username)}
                                        disabled={isThisUserCurrentUser}
                                    >
                                        <Trash2 size={14} />
                                        Eliminar Usuario del Sistema
                                    </button>
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminsView;
