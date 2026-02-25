import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_URL = ''; // Empty string means use same host (relative paths)

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

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('app_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('app_current_user');
        }
    }, [currentUser]);

    const fetchUsers = async () => {
        if (!currentUser?.isMaster) return;
        try {
            const response = await fetch(`${API_URL}/api/auth/users`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const signup = async (email, password, isMaster = false) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password, isMaster })
            });
            const data = await response.json();
            if (data.success) {
                const user = {
                    uid: data.uid,
                    username: data.username,
                    isMaster: data.isMaster,
                    accountId: data.accountId
                };
                setCurrentUser(user);
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
                    accountId: data.accountId
                };
                setCurrentUser(user);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            await fetchUsers();
        } catch (err) {
            console.error('Failed to update user role:', err);
        }
    };

    const deleteUser = async (uid) => {
        try {
            await fetch(`${API_URL}/api/auth/users/${uid}`, {
                method: 'DELETE'
            });
            await fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const value = {
        currentUser,
        isAuthenticated: !!currentUser,
        loading,
        users,
        signup,
        login,
        logout,
        updateUserRole,
        deleteUser,
        fetchUsers
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
