import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import { Shield, Trash2, Users, Crown, UserX } from 'lucide-react';

const AdminPanel = ({ isOpen, onClose, allUsers, onUpdateUser, onDeleteUser }) => {
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const [userToDelete, setUserToDelete] = useState(null);

    const handleToggleMaster = async (username) => {
        const user = allUsers.find(u => u.username === username);
        if (user) {
            await onUpdateUser(username, { isMaster: !user.isMaster });
        }
    };

    const confirmDelete = async (username) => {
        if (window.confirm(`¿Estás seguro de eliminar la cuenta de ${username}? Esta acción no se puede deshacer.`)) {
            await onDeleteUser(username);
        }
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
                        <div key={user.username} style={{
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
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <div>ID: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{user.accountId}</span></div>
                                        <div>Creado: {new Date(user.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleToggleMaster(user.username)}
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
                                        onClick={() => confirmDelete(user.username)}
                                        className="btn-danger"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.75rem'
                                        }}
                                        title="Eliminar cuenta"
                                        disabled={user.username === currentUser?.username}
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
