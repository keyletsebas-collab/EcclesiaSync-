import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

// Helper to convert DB user row to app user object
const mapUserToObj = (row) => {
    if (!row) return null;
    let memberships = typeof row.memberships === 'string' ? JSON.parse(row.memberships) : row.memberships || [];
    
    // Self-healing: if any membership is missing fullName or phone, recover it from others
    const profile = memberships.find(m => m.fullName) || {};
    const commonName = profile.fullName || row.username;
    const commonPhone = profile.phone || '';
    const commonEmail = profile.email || row.username;
    
    memberships = memberships.map(m => ({
        ...m,
        fullName: m.fullName || commonName,
        phone: m.phone || commonPhone,
        email: m.email || commonEmail
    }));

    return {
        uid: row.uid,
        username: row.username,
        password: row.password,
        isMaster: row.is_master,
        accountId: row.account_id,
        createdAt: row.created_at,
        isBlocked: row.is_blocked,
        memberships,
        birthday: row.birthday,
        address: row.address
    };
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
    const [loading, setLoading] = useState(false);

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

    // Refresh user profile/memberships on mount to keep roles and accounts in sync
    useEffect(() => {
        const refreshUser = async () => {
            if (!currentUser) return;
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('uid', currentUser.uid)
                    .single();

                if (error) throw error;
                if (data) {
                    setCurrentUser(mapUserToObj(data));
                }
            } catch (err) {
                console.error('Failed to refresh user on mount:', err);
            }
        };
        refreshUser();
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser?.uid]);

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
            const { data, error } = await supabase
                .from('users')
                .select('*');
            if (error) throw error;
            if (Array.isArray(data)) {
                setUsers(data.map(mapUserToObj));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const autoJoinTemplates = async (accountId, name, phone) => {
        if (!name || !name.trim()) return;
        try {
            // Get all templates for this account
            const { data: templates, error: tErr } = await supabase
                .from('templates')
                .select('*')
                .eq('account_id', accountId);

            if (tErr) throw tErr;
            if (!templates) return;

            // Get all members
            const { data: members, error: mErr } = await supabase
                .from('members')
                .select('*');

            if (mErr) throw mErr;

            for (const template of templates) {
                const templateMembers = (members || []).filter(m => m.template_id === template.id);
                const exists = templateMembers.some(m => m.name?.toLowerCase().trim() === name.toLowerCase().trim());
                if (!exists) {
                    const maxNumber = templateMembers.reduce((max, m) => (m.number > max ? m.number : max), 0);
                    const nextNumber = maxNumber + 1;

                    const newMemberRow = {
                        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                        template_id: template.id,
                        account_id: accountId,
                        name: name.trim(),
                        number: nextNumber,
                        phone: phone?.trim() || '',
                        identifications: {
                            familyRole: '',
                            familyName: '',
                            hasKey: false,
                            needsPrayer: false
                        },
                        created_at: new Date().toISOString()
                    };

                    const { error: insErr } = await supabase.from('members').insert([newMemberRow]);
                    if (insErr) console.error('Failed to auto join template:', insErr);
                    else console.log(`Auto-joined member ${name} to template ${template.name}`);
                }
            }
        } catch (err) {
            console.error('Failed to auto join templates:', err);
        }
    };

    const signup = async (email, password, isMaster = false, accountId = null, fullName = '', phone = '') => {
        try {
            const username = email?.toLowerCase().trim();

            // Check if username exists
            const { data: existingUser, error: checkErr } = await supabase
                .from('users')
                .select('uid')
                .eq('username', username)
                .maybeSingle();

            if (checkErr) throw checkErr;
            if (existingUser) {
                return { success: false, error: 'Username already exists' };
            }

            const finalAccountId = accountId 
                ? accountId.trim().toUpperCase() 
                : (crypto.randomUUID ? crypto.randomUUID().substring(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 10).toUpperCase());

            const uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            const createdAt = new Date().toISOString();

            const memberships = [{
                id: finalAccountId,
                role: isMaster ? 'master' : 'editor',
                expiresAt: null,
                fullName: fullName.trim(),
                phone: phone.trim(),
                email: username
            }];

            const newUserRow = {
                uid,
                username,
                password,
                is_master: isMaster,
                account_id: finalAccountId,
                created_at: createdAt,
                is_blocked: false,
                memberships
            };

            const { error: insErr } = await supabase.from('users').insert([newUserRow]);
            if (insErr) throw insErr;

            const mappedUser = mapUserToObj(newUserRow);
            setCurrentUser(mappedUser);
            setActiveAccountId(finalAccountId);

            // Auto join templates in the background
            autoJoinTemplates(finalAccountId, fullName || username, phone);

            return { success: true };
        } catch (err) {
            console.error('Signup error:', err);
            return { success: false, error: err.message || 'Server error' };
        }
    };

    const login = async (email, password) => {
        try {
            const username = email?.toLowerCase().trim();
            console.log(`🔑 Login attempt for: ${username}`);

            const { data: userRow, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .maybeSingle();

            if (error) throw error;
            if (!userRow) {
                return { success: false, error: 'Invalid username or password' };
            }

            if (userRow.is_blocked) {
                return { success: false, error: 'Account is blocked' };
            }

            const mappedUser = mapUserToObj(userRow);
            setCurrentUser(mappedUser);

            const savedActive = localStorage.getItem('app_active_account_id');
            setActiveAccountId(savedActive || mappedUser.accountId);

            return { success: true };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, error: err.message || 'Server connection error' };
        }
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const updateUserRole = async (uid, updates) => {
        try {
            const dbUpdates = {};
            if (updates.isMaster !== undefined) dbUpdates.is_master = !!updates.isMaster;
            if (updates.isBlocked !== undefined) dbUpdates.is_blocked = !!updates.isBlocked;

            const { error } = await supabase
                .from('users')
                .update(dbUpdates)
                .eq('uid', uid);

            if (error) throw error;
            await fetchUsers();
        } catch (err) {
            console.error('Failed to update user role:', err);
        }
    };

    const toggleBlockUser = async (uid, isBlocked) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_blocked: isBlocked })
                .eq('uid', uid);

            if (error) throw error;
            await fetchUsers();
        } catch (err) {
            console.error('Failed to toggle block:', err);
        }
    };

    const deleteUser = async (uid) => {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('uid', uid);

            if (error) throw error;
            await fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
    };

    const joinAccount = async (accountId) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            const cleanAccountId = accountId.trim().toUpperCase();
            const memberships = [...(currentUser.memberships || [])];

            if (memberships.some(m => m.id === cleanAccountId)) {
                return { success: false, error: 'Already a member of this account' };
            }

            const profile = memberships.find(m => m.fullName) || {};
            const name = profile.fullName || currentUser.username;
            const phone = profile.phone || '';

            memberships.push({
                id: cleanAccountId,
                role: 'editor',
                expiresAt: null,
                fullName: name,
                phone: phone,
                email: currentUser.username
            });

            const { error } = await supabase
                .from('users')
                .update({ memberships })
                .eq('uid', currentUser.uid);

            if (error) throw error;

            const updatedUser = { ...currentUser, memberships };
            setCurrentUser(updatedUser);
            setActiveAccountId(cleanAccountId);

            autoJoinTemplates(cleanAccountId, name, phone);

            return { success: true };
        } catch (err) {
            console.error('Join account error:', err);
            return { success: false, error: err.message || 'Connection error' };
        }
    };

    const updateMembershipRole = async (targetUid, accountId, role, expiresAt) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            // Check if current user is master of this account
            const myMembership = currentUser.memberships?.find(m => m.id === accountId);
            if (!currentUser.isMaster && myMembership?.role !== 'master') {
                return { success: false, error: 'Only Master of this account can manage roles' };
            }

            // Get target user
            const { data: targetRow, error: getErr } = await supabase
                .from('users')
                .select('*')
                .eq('uid', targetUid)
                .single();

            if (getErr) throw getErr;
            if (!targetRow) return { success: false, error: 'Target user not found' };

            const targetUser = mapUserToObj(targetRow);
            const memberships = [...(targetUser.memberships || [])];
            const index = memberships.findIndex(m => m.id === accountId);

            const oldMembership = index >= 0 ? memberships[index] : {};
            const newMembership = {
                ...oldMembership,
                id: accountId,
                role,
                expiresAt: expiresAt || null
            };

            if (index >= 0) {
                memberships[index] = newMembership;
            } else {
                memberships.push(newMembership);
            }

            const { error: updErr } = await supabase
                .from('users')
                .update({ memberships })
                .eq('uid', targetUid);

            if (updErr) throw updErr;

            await fetchUsers();
            return { success: true };
        } catch (err) {
            console.error('Failed to update membership role:', err);
            return { success: false, error: err.message };
        }
    };

    const canEdit = () => {
        if (!currentUser) return false;
        if (currentUser.isMaster) return true;
        const membership = currentUser.memberships?.find(m => m.id === activeAccountId);
        return membership?.role === 'master' || membership?.role === 'editor';
    };

    const updateProfile = async (birthday, address) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            const { error } = await supabase
                .from('users')
                .update({ birthday, address })
                .eq('uid', currentUser.uid);

            if (error) throw error;

            const updatedUser = { ...currentUser, birthday, address };
            setCurrentUser(updatedUser);
            return { success: true };
        } catch (err) {
            console.error('Update profile error:', err);
            return { success: false, error: err.message || 'Connection error' };
        }
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
        fetchUsers,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
