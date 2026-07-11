import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const getApiUrl = () => {
    if (typeof window === 'undefined') return 'http://127.0.0.1:3001';

    // If it's a web host (Vercel, etc.)
    if (window.location.hostname && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' && 
        window.location.hostname !== '10.0.2.2' &&
        !window.location.protocol.startsWith('file')) {
        return window.location.origin;
    }

    // Android WebView check
    if (window.navigator && /Android/i.test(window.navigator.userAgent)) {
        if (window.location.hostname === '10.0.2.2') {
            return 'http://10.0.2.2:3001';
        }
        return 'http://127.0.0.1:3001';
    }

    return 'http://127.0.0.1:3001';
};

const API_URL = getApiUrl();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('app_current_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('Failed to parse current user:', e);
            return null;
        }
    });

    const [activeAccountId, setActiveAccountId] = useState(() => {
        return localStorage.getItem('app_active_account_id') || currentUser?.accountId || null;
    });

    const [users, setUsers] = useState([]);
    const [loading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('app_current_user', JSON.stringify(currentUser));
            if (!activeAccountId && currentUser.accountId) {
                setActiveAccountId(currentUser.accountId);
            }
        } else {
            localStorage.removeItem('app_current_user');
            localStorage.removeItem('app_active_account_id');
            setActiveAccountId(null);
        }
    }, [currentUser]);

    useEffect(() => {
        if (activeAccountId) {
            localStorage.setItem('app_active_account_id', activeAccountId);
        }
    }, [activeAccountId]);

    // Validation: Ensure activeAccountId is always one of the user's memberships
    useEffect(() => {
        if (currentUser && activeAccountId) {
            const isMember = currentUser.memberships?.some(m => m.id === activeAccountId);
            if (!isMember && currentUser.accountId) {
                console.log('🔄 Resetting activeAccountId to primary account');
                setActiveAccountId(currentUser.accountId);
            }
        }
    }, [currentUser, activeAccountId]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/users`, {
                headers: {
                    'X-User-Uid': currentUser?.uid || ''
                }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const signup = async (email, password, isMaster = false, accountId = null, fullName = '', phone = '') => {
        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password, isMaster, accountId, fullName, phone, email })
            });
            const data = await response.json();
            if (data.success) {
                const user = {
                    uid: data.uid,
                    username: data.username,
                    isMaster: data.isMaster,
                    accountId: data.accountId,
                    memberships: data.memberships || []
                };
                setCurrentUser(user);
                setActiveAccountId(data.accountId);
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            console.error('Signup error:', err);
            return { success: false, error: 'Server connection error' };
        }
    };


    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password })
            });
            const data = await response.json();
            if (data.success) {
                const user = {
                    uid: data.uid,
                    username: data.username,
                    isMaster: data.isMaster,
                    accountId: data.accountId,
                    memberships: data.memberships || []
                };
                setCurrentUser(user);
                // Default to their primary account but prioritize saved active account
                const savedActive = localStorage.getItem('app_active_account_id');
                setActiveAccountId(savedActive || data.accountId);
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, error: 'Server connection error' };
        }
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const updateUserRole = async (uid, updates) => {
        try {
            await fetch(`${API_URL}/api/auth/users/${uid}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify(updates)
            });
            await fetchUsers();
        } catch (err) {
            console.error('Failed to update user role:', err);
        }
    };

    const toggleBlockUser = async (uid, isBlocked) => {
        try {
            await fetch(`${API_URL}/api/auth/users/${uid}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ isBlocked })
            });
            await fetchUsers();
        } catch (err) {
            console.error('Failed to toggle block:', err);
        }
    };

    const deleteUser = async (uid) => {
        try {
            await fetch(`${API_URL}/api/auth/users/${uid}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Uid': currentUser?.uid || ''
                }
            });
            await fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const joinAccount = async (accountId) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            const res = await fetch(`${API_URL}/api/auth/accounts/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid, accountId })
            });
            const data = await res.json();
            if (data.success) {
                const updatedUser = { ...currentUser, memberships: data.memberships };
                setCurrentUser(updatedUser);
                setActiveAccountId(accountId); // Auto-switch to joined account
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: 'Connection error' };
        }
    };

    const updateMembershipRole = async (targetUid, accountId, role, expiresAt) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_URL}/api/auth/accounts/role`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ 
                    masterUid: currentUser.uid, 
                    targetUid, 
                    accountId, 
                    role, 
                    expiresAt 
                })
            });
            return await res.json();
        } catch (err) {
            console.error('Failed to update role:', err);
        }
    };

    const canEdit = () => {
        if (!currentUser) return false;
        if (currentUser.isMaster) return true;
        const membership = currentUser.memberships?.find(m => m.id === activeAccountId);
        return membership?.role === 'master' || membership?.role === 'editor';
    };

    const value = {
        currentUser,
        activeAccountId,
        setActiveAccountId,
        isAuthenticated: !!currentUser,
        canEdit: canEdit(),
        loading,
        users,
        signup,
        login,
        logout,
        joinAccount,
        updateMembershipRole,
        updateUserRole,
        toggleBlockUser,
        deleteUser,
        fetchUsers
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
