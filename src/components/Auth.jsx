import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LogIn, UserPlus, Shield, Sparkles } from 'lucide-react';

const Auth = () => {
    const { login, signup, users, updateUserRole, deleteUser } = useAuth();
    const { t } = useLanguage();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthday, setBirthday] = useState('');
    const [accountId, setAccountId] = useState(''); // NEW: for joining existing account
    const [churchName, setChurchName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!password.trim()) {
            setError('La contraseña es requerida');
            return;
        }

        if (!username.trim()) {
            setError('El usuario/correo es requerido');
            return;
        }

        if (!isLogin && (!fullName.trim() || !phone.trim())) {
            setError('Todos los campos (Nombre, Correo, Número, Contraseña) son obligatorios para registrarse.');
            return;
        }

        setLoading(true);
        try {
            const result = isLogin
                ? await login(username, password)
                : await signup(username, password, username.toLowerCase().trim() === 'keylet', accountId, fullName, phone, churchName, birthday);

            if (!result.success) {
                if (result.isDuplicate) {
                    setIsLogin(true);
                    setError(result.error);
                } else {
                    const msg = result.error === 'Account is blocked'
                        ? '🔒 Tu cuenta ha sido bloqueada. Contacta al administrador.'
                        : result.error;
                    setError(msg);
                }
            } else if (!isLogin && result.accountId) {
                setSuccessMessage(`¡Cuenta creada con éxito! ID de tu Iglesia Adventista: ${result.accountId}`);
            }
        } catch (err) {
            setError(err.message || 'Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccessMessage('');
        setAccountId('');
        setChurchName('');
        setFullName('');
        setPhone('');
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
                        <Sparkles size={32} color="white" />
                    </div>
                    <h1 style={{ 
                        fontSize: '2.25rem', 
                        marginBottom: '0.25rem',
                        fontWeight: 800
                    }}>
                        VerbumSync
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isLogin ? t('login') : t('signup')}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                                    Nombre Completo *
                                </label>
                                <input
                                    className="glass-input"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Ej: Juan Pérez"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                                    Número de Contacto *
                                </label>
                                <input
                                    className="glass-input"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Ej: +1 555-1234"
                                    required
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                                    Fecha de Cumpleaños (Opcional)
                                </label>
                                <input
                                    type="date"
                                    className="glass-input"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                            {isLogin ? t('username') : 'Correo Electrónico *'}
                        </label>
                        <input
                            className="glass-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={isLogin ? "Usuario o Correo" : "Ej: correo@ejemplo.com"}
                            autoFocus={isLogin}
                            required
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                            {t('password')} *
                        </label>
                        <input
                            className="glass-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                                    {t('accountId')} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({t('optional')})</span>
                                </label>
                                <input
                                    className="glass-input"
                                    value={accountId}
                                    onChange={(e) => {
                                        setAccountId(e.target.value);
                                        if (e.target.value.trim() !== '') {
                                            setChurchName('');
                                        }
                                    }}
                                    placeholder="E.g. 044EDFD5"
                                    style={{ textTransform: 'uppercase' }}
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                    Para unirte a una cuenta existente, introduce su ID. Déjalo en blanco para crear una nueva iglesia adventista.
                                </p>
                            </div>

                            {!accountId.trim() && (
                                <div className="input-group animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                                        Nombre de la Nueva Iglesia  *
                                    </label>
                                    <input
                                        className="glass-input"
                                        value={churchName}
                                        onChange={(e) => setChurchName(e.target.value)}
                                        placeholder="Ej: Iglesia Adventista"
                                        required={!accountId.trim()}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                        Escribe el nombre de la Iglesia que deseas registrar.
                                    </p>
                                </div>
                            )}
                        </>
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

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={loading}
                    >
                        {loading 
                            ? (isLogin ? 'Iniciando sesión...' : 'Creando cuenta...') 
                            : (isLogin ? t('loginButton') : t('signupButton'))}
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
        </div>
    );
};


export default Auth;
