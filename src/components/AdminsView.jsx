import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, Trash2, Users, Crown, Eye, EyeOff, Key, Clock, Calendar, Check, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdminsView = () => {
    const { currentUser, activeAccountId, users, fetchUsers, updateMembershipRole, updateUserRole, toggleBlockUser, deleteUser } = useAuth();
    const { t } = useLanguage();
    
    const [visiblePasswords, setVisiblePasswords] = useState({}); // uid -> boolean
    const [editStates, setEditStates] = useState({}); // uid -> { role, durationType, expiresAt }
    const [successMessage, setSuccessMessage] = useState('');

    const isSuperAdmin = currentUser?.username?.toLowerCase().trim() === 'keylet';
    const [selectedChurchCode, setSelectedChurchCode] = useState(activeAccountId);
    const [churches, setChurches] = useState([]);
    const [loadingChurches, setLoadingChurches] = useState(false);
    const [editingChurchCode, setEditingChurchCode] = useState(null);
    const [editChurchName, setEditChurchName] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');
    const [grantStates, setGrantStates] = useState({}); // uid -> { churchCode, role, durationType, expiresAt }

    const handleGrantStateChange = (uid, field, value) => {
        setGrantStates(prev => ({
            ...prev,
            [uid]: {
                churchCode: targetAccountId,
                role: 'viewer',
                durationType: 'indefinite',
                expiresAt: '',
                ...(prev[uid] || {}),
                [field]: value
            }
        }));
    };

    const fetchChurches = async () => {
        setLoadingChurches(true);
        try {
            // Collect all unique account IDs from users memberships to discover legacy churches
            const allAccountIds = new Set();
            users.forEach(u => {
                if (u.accountId) allAccountIds.add(u.accountId);
                u.memberships?.forEach(m => {
                    if (m.id) allAccountIds.add(m.id);
                });
            });

            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('name', '__church_metadata__');

            if (!error && data) {
                const metadataAccountIds = new Set(data.map(item => item.account_id));
                const mapped = data.map(item => {
                    const nameField = item.custom_fields?.find(f => f.startsWith('__church_name:'));
                    const creatorUidField = item.custom_fields?.find(f => f.startsWith('__creator_uid:'));
                    const creatorUserField = item.custom_fields?.find(f => f.startsWith('__creator_username:'));

                    return {
                        templateId: item.id,
                        code: item.account_id,
                        name: nameField ? nameField.replace('__church_name:', '') : 'Sin Nombre',
                        creatorUid: creatorUidField ? creatorUidField.replace('__creator_uid:', '') : '',
                        creatorUsername: creatorUserField ? creatorUserField.replace('__creator_username:', '') : 'Desconocido',
                        createdAt: item.created_at
                    };
                });

                // Synthesize placeholders for legacy churches
                allAccountIds.forEach(code => {
                    if (!metadataAccountIds.has(code)) {
                        mapped.push({
                            templateId: null,
                            code: code,
                            name: `Iglesia ${code} (Sin nombre asignado)`,
                            creatorUid: 'legacy',
                            creatorUsername: 'Legacy / Desconocido',
                            createdAt: new Date().toISOString()
                        });
                    }
                });

                setChurches(mapped);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingChurches(false);
        }
    };

    const handleDeleteChurch = async (churchCode) => {
        if (!window.confirm(`¿Estás completamente seguro de eliminar esta iglesia (${churchCode})? Esta acción eliminará permanentemente la iglesia, todas sus plantillas, miembros, salidas, transacciones e información asociada. Esta acción no se puede deshacer.`)) {
            return;
        }
        
        try {
            // Delete church metadata
            await supabase
                .from('templates')
                .delete()
                .eq('account_id', churchCode);

            // Delete all templates under this account
            await supabase
                .from('templates')
                .delete()
                .eq('account_id', churchCode);

            // Delete all members under this account
            await supabase
                .from('members')
                .delete()
                .eq('account_id', churchCode);

            // Delete all services under this account
            await supabase
                .from('services')
                .delete()
                .eq('account_id', churchCode);

            // Delete all transactions under this account
            await supabase
                .from('transactions')
                .delete()
                .eq('account_id', churchCode);

            // Delete all programs under this account
            await supabase
                .from('programs')
                .delete()
                .eq('account_id', churchCode);

            // Clean up users' memberships/accountId associated with this church
            const { data: dbUsers, error: usersErr } = await supabase
                .from('users')
                .select('*');

            if (!usersErr && dbUsers) {
                for (const u of dbUsers) {
                    let needsUpdate = false;
                    let updatedAccountId = u.accountId;
                    let updatedMemberships = u.memberships || [];

                    if (u.accountId === churchCode) {
                        updatedAccountId = '';
                        needsUpdate = true;
                    }

                    const filteredMemberships = updatedMemberships.filter(m => m.id !== churchCode);
                    if (filteredMemberships.length !== updatedMemberships.length) {
                        updatedMemberships = filteredMemberships;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await supabase
                            .from('users')
                            .update({
                                accountId: updatedAccountId,
                                memberships: updatedMemberships
                            })
                            .eq('uid', u.uid);
                    }
                }
            }

            setSuccessMessage(`La iglesia (${churchCode}) ha sido eliminada por completo.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            if (selectedChurchCode === churchCode) {
                setSelectedChurchCode(null);
            }
            fetchChurches();
        } catch (err) {
            console.error('Error deleting church:', err);
            alert('Error al eliminar la iglesia: ' + err.message);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) {
            fetchChurches();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        setSelectedChurchCode(activeAccountId);
    }, [activeAccountId]);

    const targetAccountId = isSuperAdmin ? selectedChurchCode : activeAccountId;

    useEffect(() => {
        fetchUsers();
    }, [targetAccountId]);

    const togglePasswordVisibility = (uid) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    const handleInitEditState = (user) => {
        if (editStates[user.uid]) return;
        
        const membership = user.memberships?.find(m => m.id === targetAccountId);
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
            const res = await updateMembershipRole(user.uid, targetAccountId, role, expiresAtIso);
            if (res && res.success === false) {
                alert(`Error al actualizar rol: ${res.error}`);
                return;
            }

            setEditStates(prev => {
                const next = { ...prev };
                delete next[user.uid];
                return next;
            });
            
            setSuccessMessage(`Rol de ${user.username} actualizado correctamente.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchUsers();
        } catch (err) {
            console.error(err);
            alert(`Error inesperado: ${err.message || err}`);
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

    const activeChurchUsers = users.filter(user => 
        user.memberships?.some(m => m.id === targetAccountId)
    );

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
                        Administra los roles, permisos temporales y cuentas de usuario para la iglesia activa: <strong style={{ color: 'var(--primary)' }}>{targetAccountId}</strong>
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

            {isSuperAdmin && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                        fontSize: '1.1rem',
                        fontWeight: 600
                    }}>
                        ⛪ Gestión Global de Iglesias (Super Admin)
                    </h3>
                    
                    {loadingChurches ? (
                        <div style={{ color: 'var(--text-muted)' }}>Cargando iglesias...</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                            {churches.map(c => {
                                const isEditing = editingChurchCode === c.code;
                                const isSelected = selectedChurchCode === c.code;
                                return (
                                    <div key={c.code} style={{
                                        padding: '1rem',
                                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            {isEditing ? (
                                                <form onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    if (!editChurchName.trim()) return;
                                                    
                                                    try {
                                                        const { data: metaTemplate } = await supabase
                                                            .from('templates')
                                                            .select('*')
                                                            .eq('account_id', c.code)
                                                            .eq('name', '__church_metadata__')
                                                            .maybeSingle();

                                                        if (metaTemplate) {
                                                            const updatedFields = metaTemplate.custom_fields.map(f => {
                                                                if (f.startsWith('__church_name:')) {
                                                                    return `__church_name:${editChurchName.trim()}`;
                                                                }
                                                                return f;
                                                            });
                                                            await supabase
                                                                .from('templates')
                                                                .update({ custom_fields: updatedFields })
                                                                .eq('id', metaTemplate.id);
                                                        } else {
                                                            const metadataTemplateId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
                                                            const metadataRow = {
                                                                id: metadataTemplateId,
                                                                account_id: c.code,
                                                                name: '__church_metadata__',
                                                                custom_fields: [`__church_name:${editChurchName.trim()}`, `__creator_uid:legacy`, `__creator_username:legacy`],
                                                                created_at: new Date().toISOString()
                                                            };
                                                            await supabase.from('templates').insert([metadataRow]);
                                                        }
                                                        setEditingChurchCode(null);
                                                        fetchChurches();
                                                        setSuccessMessage('Nombre de iglesia actualizado.');
                                                        setTimeout(() => setSuccessMessage(''), 3000);
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="glass-input"
                                                        value={editChurchName}
                                                        onChange={(e) => setEditChurchName(e.target.value)}
                                                        style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                    />
                                                    <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Guardar</button>
                                                    <button type="button" onClick={() => setEditingChurchCode(null)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>Cancelar</button>
                                                </form>
                                            ) : (
                                                <div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({c.code})</span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {!isEditing && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingChurchCode(c.code);
                                                            setEditChurchName(c.name);
                                                        }}
                                                        className="btn"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
                                                    >
                                                        ✏️ Editar Nombre
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedChurchCode(c.code)}
                                                    className={`btn ${isSelected ? 'btn-primary' : ''}`}
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: isSelected ? '' : 'var(--bg-glass)', border: isSelected ? '' : '1px solid var(--border)' }}
                                                >
                                                    🔍 Ver Usuarios
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteChurch(c.code)}
                                                    className="btn"
                                                    style={{ 
                                                        padding: '0.25rem 0.5rem', 
                                                        fontSize: '0.75rem', 
                                                        background: 'rgba(239, 68, 68, 0.1)', 
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        color: '#f87171' 
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                >
                                                    🗑️ Eliminar Iglesia
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            Creador: {c.creatorUsername} ({c.creatorUid}) | Registrada el: {new Date(c.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                    Usuarios Registrados en esta Iglesia ({activeChurchUsers.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activeChurchUsers.map(user => {
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
                                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
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
                                                            background: m.id === targetAccountId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                            border: m.id === targetAccountId ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.05)',
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

                                    {/* Role Configuration Form for targetAccountId */}
                                    <div style={{
                                        flex: '1 1 260px',
                                        minWidth: 0,
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
                                            Ajustes de Rol para {targetAccountId}
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {/* Role Selector */}
                                            <div style={{ flex: '1 1 140px' }}>
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
                                                <div style={{ flex: '1 1 140px' }}>
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

                                            {user.memberships?.some(m => m.id === targetAccountId) ? (
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
                                                        const res = await updateMembershipRole(user.uid, targetAccountId, 'remove', null);
                                                        if (res && res.success === false) {
                                                            alert(`Error al quitar acceso: ${res.error}`);
                                                            return;
                                                        }
                                                        setEditStates(prev => {
                                                            const next = { ...prev };
                                                            delete next[user.uid];
                                                            return next;
                                                        });
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
                                                        const res = await updateMembershipRole(user.uid, targetAccountId, 'viewer', null);
                                                        if (res && res.success === false) {
                                                            alert(`Error al dar acceso: ${res.error}`);
                                                            return;
                                                        }
                                                        setEditStates(prev => {
                                                            const next = { ...prev };
                                                            delete next[user.uid];
                                                            return next;
                                                        });
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
                                    flexWrap: 'wrap',
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
                                            color: user.isMaster ? '#fca5a5' : '#a5b4fc',
                                            flex: '1 1 260px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.35rem'
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
                                            color: user.isBlocked ? '#34d399' : '#fca5a5',
                                            flex: '1 1 260px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.35rem'
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
                                            fontSize: '0.75rem',
                                            flex: '1 1 260px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.35rem'
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

            {/* SECTION 2: Global User Directory and Cross-Church Access Management */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            margin: 0
                        }}>
                            🌐 Directorio Global de Todos los Usuarios ({users.length})
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                            Concede o revoca acceso a cualquier iglesia del sistema para cualquier usuario sin importar su iglesia de origen.
                        </p>
                    </div>

                    <input
                        type="text"
                        className="glass-input"
                        placeholder="🔍 Buscar por nombre o ID de cuenta..."
                        value={globalSearch}
                        onChange={e => setGlobalSearch(e.target.value)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '280px' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {users
                        .filter(u => {
                            if (!globalSearch.trim()) return true;
                            const query = globalSearch.toLowerCase().trim();
                            const matchesName = u.username?.toLowerCase().includes(query);
                            const matchesAccount = u.accountId?.toLowerCase().includes(query);
                            const matchesMembership = u.memberships?.some(m => m.id?.toLowerCase().includes(query));
                            return matchesName || matchesAccount || matchesMembership;
                        })
                        .map(user => {
                            const isThisUserCurrentUser = user.uid === currentUser?.uid;
                            const gState = grantStates[user.uid] || { churchCode: targetAccountId, role: 'viewer', durationType: 'indefinite', expiresAt: '' };

                            return (
                                <div key={`global-${user.uid}`} style={{
                                    padding: '1.25rem',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        {/* User Main Info */}
                                        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>{user.username}</span>
                                                {isThisUserCurrentUser && (
                                                    <span style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: 'var(--primary)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>Tú</span>
                                                )}
                                                {user.isMaster && (
                                                    <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Crown size={10} /> MASTER GLOBAL
                                                    </span>
                                                )}
                                                {user.isBlocked && (
                                                    <span style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>Bloqueado</span>
                                                )}
                                            </div>

                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                <div>ID Primario: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{user.accountId}</span></div>
                                            </div>

                                            {/* Memberships Badges with instant Remove button */}
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Iglesias con Acceso Concedido:</span>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {(user.memberships || []).map((m, idx) => (
                                                        <div key={idx} style={{
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.7rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem'
                                                        }}>
                                                            <span>📁 {m.id} ({m.role})</span>
                                                            <button
                                                                title={`Quitar acceso a la iglesia ${m.id}`}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                                    border: 'none',
                                                                    color: '#fca5a5',
                                                                    borderRadius: '50%',
                                                                    width: '18px',
                                                                    height: '18px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.7rem',
                                                                    padding: 0
                                                                }}
                                                                onClick={async () => {
                                                                    if (window.confirm(`¿Quitar acceso de ${user.username} a la iglesia ${m.id}?`)) {
                                                                        const res = await updateMembershipRole(user.uid, m.id, 'remove', null);
                                                                        if (res && res.success === false) {
                                                                            alert(`Error: ${res.error}`);
                                                                            return;
                                                                        }
                                                                        setSuccessMessage(`Acceso revocado a ${m.id} para ${user.username}.`);
                                                                        setTimeout(() => setSuccessMessage(''), 3000);
                                                                        await fetchUsers();
                                                                    }
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(user.memberships || []).length === 0 && <span style={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ninguna iglesia asignada</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grant Access Form */}
                                        <div style={{
                                            flex: '1 1 300px',
                                            minWidth: 0,
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <Key size={14} color="var(--primary)" />
                                                Conceder Acceso a Iglesia
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {/* Select or type Church ID */}
                                                <div style={{ flex: '1 1 140px' }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Seleccionar Iglesia</label>
                                                    <select
                                                        className="glass-input"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }}
                                                        value={gState.churchCode}
                                                        onChange={e => handleGrantStateChange(user.uid, 'churchCode', e.target.value)}
                                                    >
                                                        {churches.map(c => (
                                                            <option key={c.code} value={c.code}>
                                                                {c.name} ({c.code})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Role Selector */}
                                                <div style={{ flex: '1 1 120px' }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Rol a Asignar</label>
                                                    <select
                                                        className="glass-input"
                                                        style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%' }}
                                                        value={gState.role}
                                                        onChange={e => handleGrantStateChange(user.uid, 'role', e.target.value)}
                                                    >
                                                        <option value="viewer">👁️ Viewer (Lectura)</option>
                                                        <option value="editor">✍️ Editor (Escritura)</option>
                                                        <option value="master">👑 Master (Admin)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Submit Grant Access Button */}
                                            <button
                                                className="btn btn-primary"
                                                style={{
                                                    padding: '0.45rem 1rem',
                                                    fontSize: '0.8rem',
                                                    justifyContent: 'center',
                                                    marginTop: '0.25rem'
                                                }}
                                                onClick={async () => {
                                                    const targetChurch = gState.churchCode || targetAccountId;
                                                    const res = await updateMembershipRole(user.uid, targetChurch, gState.role, null);
                                                    if (res && res.success === false) {
                                                        alert(`Error al conceder acceso: ${res.error}`);
                                                        return;
                                                    }
                                                    setSuccessMessage(`Acceso (${gState.role}) concedido a ${targetChurch} para ${user.username}.`);
                                                    setTimeout(() => setSuccessMessage(''), 3000);
                                                    await fetchUsers();
                                                }}
                                            >
                                                🔓 Conceder Acceso a {gState.churchCode || targetAccountId}
                                            </button>
                                        </div>
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
