import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LogIn, UserPlus, Shield, BookOpen } from 'lucide-react';
import AdminPanel from './AdminPanel';

const Auth = () => {
    const { login, signup, users, updateUserRole, deleteUser } = useAuth();
    const { t } = useLanguage();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isMaster, setIsMaster] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Secret admin password
    const ADMIN_PASSWORD = 'superadmin2024';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!password.trim()) {
            setError('Password is required');
            return;
        }

        // Check for admin panel access - just password needed
        if (password === ADMIN_PASSWORD) {
            setShowAdminPanel(true);
            setPassword(''); // Clear password for security
            setUsername('');
            return;
        }

        if (!username.trim()) {
            setError('Username and password are required');
            return;
        }

        const result = isLogin
            ? await login(username, password)
            : await signup(username, password, isMaster);

        if (!result.success) {
            setError(result.error);
        } else if (!isLogin && result.accountId) {
            // Show account ID briefly after signup
            setSuccessMessage(`Account created! Your Account ID: ${result.accountId}`);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccessMessage('');
        setIsMaster(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        padding: '1rem',
                        borderRadius: '16px',
                        marginBottom: '1rem'
                    }}>
                        <BookOpen size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                        {t('appName')}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isLogin ? t('login') : t('signup')}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            {t('username')}
                        </label>
                        <input
                            className="glass-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            {t('password')}
                        </label>
                        <input
                            className="glass-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {!isLogin && (
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={isMaster}
                                    onChange={(e) => setIsMaster(e.target.checked)}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Shield size={16} color="var(--primary)" />
                                        <span style={{ fontWeight: 500 }}>{t('createMasterAccount')}</span>
                                    </div>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        marginTop: '0.25rem',
                                        marginLeft: '1.5rem'
                                    }}>
                                        {t('masterAccountHint')}
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}

                    {successMessage && (
                        <div style={{
                            padding: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: 'var(--radius)',
                            color: '#6ee7b7',
                            fontSize: '0.875rem',
                            marginBottom: '1rem',
                            fontWeight: 600,
                            textAlign: 'center'
                        }}>
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 'var(--radius)',
                            color: '#fca5a5',
                            fontSize: '0.875rem',
                            marginBottom: '1rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        {isLogin ? t('loginButton') : t('signupButton')}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    textAlign: 'center',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid var(--border)'
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}
                    </p>
                    <button
                        onClick={toggleMode}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            fontWeight: 600
                        }}
                    >
                        {isLogin ? t('signup') : t('login')}
                    </button>
                </div>
            </div>

            {/* Admin Panel */}
            <AdminPanel
                isOpen={showAdminPanel}
                onClose={() => setShowAdminPanel(false)}
                allUsers={users}
                onUpdateUser={updateUserRole}
                onDeleteUser={deleteUser}
            />
        </div>
    );
};

export default Auth;
