import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';

const AuthContext = createContext();
// Firebase Migration: API logic is being phased out

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch additional user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setCurrentUser({
                        uid: user.uid,
                        username: user.email,
                        isMaster: userData.isMaster || false,
                        accountId: userData.accountId
                    });
                } else {
                    // Fallback if doc doesn't exist yet
                    setCurrentUser({
                        uid: user.uid,
                        username: user.email,
                        isMaster: false,
                        accountId: user.uid.substring(0, 8).toUpperCase()
                    });
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchUsers = async () => {
        if (!currentUser?.isMaster) return;
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList = [];
            querySnapshot.forEach((doc) => {
                usersList.push({ ...doc.data(), uid: doc.id });
            });
            setUsers(usersList);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const signup = async (email, password, isMaster = false) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const accountId = Math.random().toString(36).substring(2, 10).toUpperCase();

            const userData = {
                username: email,
                isMaster,
                accountId,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', user.uid), userData);

            return { success: true, accountId };
        } catch (err) {
            console.error('Signup error:', err);
            return { success: false, error: err.message };
        }
    };

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, error: err.message };
        }
    };

    const logout = () => signOut(auth);

    const updateUserRole = async (uid, updates) => {
        try {
            await updateDoc(doc(db, 'users', uid), updates);
            await fetchUsers();
        } catch (err) {
            console.error('Failed to update user role:', err);
        }
    };

    const deleteUser = async (uid) => {
        try {
            await deleteDoc(doc(db, 'users', uid));
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
