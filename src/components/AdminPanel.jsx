import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import { Shield, Trash2, Users, Crown, UserX, Eye, EyeOff, Key } from 'lucide-react';

const AdminPanel = ({ isOpen, onClose, allUsers, onUpdateUser, onDeleteUser }) => {
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const [userToDelete, setUserToDelete] = useState(null);
    const [visiblePasswords, setVisiblePasswords] = useState({}); // uid -> boolean

    const handleToggleMaster = async (uid) => {
        const user = allUsers.find(u => u.uid === uid);
        if (user) {
            await onUpdateUser(uid, { isMaster: !user.isMaster });
        }
    };

    const confirmDelete = async (uid, username) => {
        if (window.confirm(`¿Estás seguro de eliminar la cuenta de ${username}? Esta acción no se puede deshacer.`)) {
            await onDeleteUser(uid);
        }
    };

    const togglePasswordVisibility = (uid) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🔐 Super Admin Panel">
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Shield size={16} color="#fca5a5" />
                        <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.875rem' }}>
                            Modo Super Administrador
                        </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        Puedes cambiar roles y eliminar cuentas. Usa con precaución.
                    </p>
                </div>

                <h4 style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600
                }}>
                    <Users size={16} />
                    Usuarios Registrados ({allUsers.length})
                </h4>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {allUsers.map(user => (
                        <div key={user.uid} style={{
                            padding: '1rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            marginBottom: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.username}</span>
                                        {user.isMaster && (
                                            <span style={{
                                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                <Crown size={10} />
                                                MASTER
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>ID: </span>
                                            <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>{user.accountId}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Key size={12} />
                                            <span>Clave: </span>
                                            <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.1em' }}>
                                                {visiblePasswords[user.uid] ? user.password : '••••••••'}
                                            </span>
                                            <button 
                                                onClick={() => togglePasswordVisibility(user.uid)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                                            >
                                                {visiblePasswords[user.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        <div>Creado: {new Date(user.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleToggleMaster(user.uid)}
                                        className="btn"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.75rem',
                                            background: user.isMaster ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                            border: user.isMaster ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)'
                                        }}
                                        title={user.isMaster ? 'Quitar permisos Master' : 'Hacer Master'}
                                    >
                                        <Shield size={14} />
                                        {user.isMaster ? 'Quitar' : 'Hacer Master'}
                                    </button>

                                    <button
                                        onClick={() => confirmDelete(user.uid, user.username)}
                                        className="btn-danger"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.75rem'
                                        }}
                                        title="Eliminar cuenta"
                                        disabled={user.uid === currentUser?.uid}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={onClose}
                className="btn"
                style={{ width: '100%', justifyContent: 'center' }}
            >
                Cerrar Panel
            </button>
        </Modal>
    );
};

export default AdminPanel;
