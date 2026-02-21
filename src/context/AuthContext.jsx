import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext();
const API = import.meta.env.VITE_API_URL ||
    (window.location.hostname.includes('vercel.app') ? '/api' : 'http://192.168.100.179:3001/api');

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

    // Fetch users list from API
    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API}/auth/users`);
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('app_current_user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('app_current_user');
        }
    }, [currentUser]);

    const signup = async (username, password, isMaster = false) => {
        try {
            const res = await fetch(`${API}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, isMaster })
            });
            const data = await res.json();
            if (!data.success) return { success: false, error: data.error };
            setCurrentUser({ username: data.username, isMaster: data.isMaster, accountId: data.accountId });
            await fetchUsers();
            return { success: true, accountId: data.accountId };
        } catch (err) {
            return { success: false, error: 'Cannot connect to server. Is the backend running?' };
        }
    };

    const login = async (username, password) => {
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!data.success) return { success: false, error: data.error };
            setCurrentUser({ username: data.username, isMaster: data.isMaster, accountId: data.accountId });
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Cannot connect to server. Is the backend running?' };
        }
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const updateUserRole = async (username, updates) => {
        try {
            await fetch(`${API}/auth/users/${username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            await fetchUsers();
        } catch (err) {
            console.error('Failed to update user role:', err);
        }
    };

    const deleteUser = async (username) => {
        try {
            await fetch(`${API}/auth/users/${username}`, { method: 'DELETE' });
            if (currentUser?.username === username) logout();
            await fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const value = {
        currentUser,
        isAuthenticated: !!currentUser,
        users,
        signup,
        login,
        logout,
        updateUserRole,
        deleteUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
