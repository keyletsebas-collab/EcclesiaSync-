import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import notificationService from '../utils/NotificationService';
const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

// Helper to extract all name variations (username, fullNames, email prefixes, accent-stripped) and phones for matching members
const getNamesAndPhonesForUser = (userObj) => {
    const names = new Set();
    const phones = new Set();

    if (!userObj) return { names, phones };

    const addNormalized = (str) => {
        if (!str || typeof str !== 'string') return;
        const trimmed = str.toLowerCase().trim();
        if (!trimmed) return;

        names.add(trimmed);

        if (trimmed.includes('@')) {
            const prefix = trimmed.split('@')[0].trim();
            if (prefix) {
                names.add(prefix);
                const noAccents = prefix.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                names.add(noAccents);
            }
        } else {
            const noAccents = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            names.add(noAccents);
        }
    };

    addNormalized(userObj.username);

    (userObj.memberships || []).forEach(m => {
        addNormalized(m.fullName);
        if (m.phone?.trim()) phones.add(m.phone.trim());
    });

    return { names, phones };
};

const generateUserCode = (str) => {
    let hash = 0;
    const input = String(str || Math.random());
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-6);
    return `EC-${hex}`;
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

    // Guarantee user has their primary church account_id in memberships list
    if (row.account_id && !memberships.some(m => m.id === row.account_id)) {
        memberships.unshift({
            id: row.account_id,
            role: row.is_master ? 'master' : 'editor',
            fullName: commonName,
            phone: commonPhone,
            email: commonEmail,
            expiresAt: null
        });
    }

    const userCode = row.user_code || generateUserCode(row.uid);

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
        address: row.address,
        userCode: userCode
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
                    .maybeSingle();

                if (error) throw error;
                if (!data || data.is_blocked) {
                    console.log('🔒 La cuenta ya no existe en la base de datos o está bloqueada. Cerrando sesión...');
                    setCurrentUser(null);
                } else {
                    setCurrentUser(mapUserToObj(data));
                }
            } catch (err) {
                console.error('Failed to refresh user on mount:', err);
                if (err.code === 'PGRST116') {
                    setCurrentUser(null);
                }
            }
        };
        refreshUser();
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser?.uid]);

    // Realtime subscription for users table (instant membership revocation, role updates, deletion, and blocking)
    useEffect(() => {
        if (!currentUser?.uid) return;

        console.log(`🔌 [AuthContext] Subscribing to realtime updates for user ${currentUser.uid}`);
        const userChannel = supabase
            .channel(`user-realtime-${currentUser.uid}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users'
            }, (payload) => {
                console.log('⚡ [AuthContext Realtime] Users table changed in DB:', payload);
                fetchUsers();

                if (payload.eventType === 'DELETE' && (payload.old?.uid === currentUser.uid || payload.old?.username === currentUser.username)) {
                    alert('Tu cuenta ha sido eliminada por un administrador.');
                    setCurrentUser(null);
                    return;
                }

                if (payload.new && payload.new.uid === currentUser.uid) {
                    const updatedUser = mapUserToObj(payload.new);

                    // Compare memberships to detect kicks, joins, and role updates
                    const oldMemberships = currentUser.memberships || [];
                    const newMemberships = updatedUser.memberships || [];

                    // 1. Detect if kicked from a church
                    const lostMemberships = oldMemberships.filter(om => !newMemberships.some(nm => nm.id === om.id));
                    if (lostMemberships.length > 0) {
                        lostMemberships.forEach(lm => {
                            notificationService.notifyKickedFromChurch(lm.id);
                        });
                    }

                    // 2. Detect joins or role updates (admin, editor, viewer)
                    newMemberships.forEach(nm => {
                        const om = oldMemberships.find(o => o.id === nm.id);
                        if (om && om.role !== nm.role) {
                            notificationService.notifyRoleChanged(nm.id, nm.role);
                        } else if (!om) {
                            notificationService.notifyJoinedChurch(nm.id, nm.role);
                        }
                    });

                    setCurrentUser(updatedUser);

                    if (updatedUser.isBlocked) {
                        alert('Tu cuenta ha sido bloqueada por un administrador.');
                        setCurrentUser(null);
                        return;
                    }

                    // Check if access to current activeAccountId was revoked
                    if (activeAccountId && activeAccountId !== updatedUser.accountId) {
                        const stillHasAccess = updatedUser.memberships?.some(m => m.id === activeAccountId);
                        if (!stillHasAccess) {
                            alert(`Se ha revocado tu acceso a esa iglesia. La aplicación te ha asignado automáticamente a tu iglesia propia (ID: ${updatedUser.accountId}).`);
                            console.log('⚠️ Acceso revocado a esta iglesia. Cambiando a cuenta primaria...');
                            setActiveAccountId(updatedUser.accountId);
                        }
                    }
                }
            })
            .subscribe();

        return () => {
            userChannel.unsubscribe();
        };
    }, [currentUser?.uid, activeAccountId]);

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

    const signup = async (email, password, isMaster = false, accountId = null, fullName = '', phone = '', churchName = '', birthday = null) => {
        try {
            const username = email?.toLowerCase().trim();

            // Check if username exists
            const { data: existingUser, error: checkErr } = await supabase
                .from('users')
                .select('uid')
                .eq('username', username)
                .maybeSingle();

            if (checkErr && checkErr.code !== 'PGRST116') throw checkErr;
            if (existingUser || (checkErr && checkErr.code === 'PGRST116')) {
                return { success: false, error: 'Este correo ya tiene una cuenta. Por favor, inicia sesión.', isDuplicate: true };
            }

            // Also check if the email is inside any user's memberships (e.g. they registered a username but put this email in their profile)
            const { data: allUsers, error: allUsersErr } = await supabase
                .from('users')
                .select('memberships');

            if (!allUsersErr && allUsers) {
                const emailInUse = allUsers.some(u => {
                    const mems = typeof u.memberships === 'string' ? JSON.parse(u.memberships) : (u.memberships || []);
                    return mems.some(m => m.email?.toLowerCase().trim() === username);
                });
                if (emailInUse) {
                    return { success: false, error: 'Este correo ya tiene una cuenta. Por favor, inicia sesión.', isDuplicate: true };
                }
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

            const userCode = generateUserCode(uid);

            const newUserRow = {
                uid,
                username,
                password,
                is_master: isMaster,
                account_id: finalAccountId,
                created_at: createdAt,
                is_blocked: false,
                memberships,
                birthday: birthday ? birthday.trim() : null,
                user_code: userCode
            };

            const { error: insErr } = await supabase.from('users').insert([newUserRow]);
            if (insErr) throw insErr;

            // If they created a new church, insert church metadata template
            if (!accountId && churchName.trim()) {
                const metadataTemplateId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
                const metadataRow = {
                    id: metadataTemplateId,
                    account_id: finalAccountId,
                    name: '__church_metadata__',
                    custom_fields: [`__church_name:${churchName.trim()}`, `__creator_uid:${uid}`, `__creator_username:${username}`],
                    created_at: new Date().toISOString()
                };
                const { error: metaErr } = await supabase.from('templates').insert([metadataRow]);
                if (metaErr) console.error('Failed to create church metadata:', metaErr);
            }

            const mappedUser = mapUserToObj(newUserRow);
            setCurrentUser(mappedUser);
            setActiveAccountId(finalAccountId);

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
            if (updates.memberships !== undefined) dbUpdates.memberships = updates.memberships;

            const { error } = await supabase
                .from('users')
                .update(dbUpdates)
                .eq('uid', uid);

            if (error) throw error;
            await fetchUsers();
        } catch (err) {
            console.error('Failed to update user role:', err);
            alert(`Error al actualizar rol del usuario: ${err.message || err}`);
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
            alert(`Error al cambiar estado de bloqueo: ${err.message || err}`);
        }
    };

    const deleteUser = async (uid) => {
        try {
            // Get user info first to find associated members
            const { data: userToDelete, error: fetchErr } = await supabase
                .from('users')
                .select('*')
                .eq('uid', uid)
                .maybeSingle();

            if (fetchErr) throw fetchErr;

            // Delete the user
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('uid', uid);

            if (error) throw error;

            if (currentUser?.uid === uid) {
                setCurrentUser(null);
            }

            // Cascade delete the associated members in templates
            if (userToDelete) {
                const mappedUser = mapUserToObj(userToDelete);
                const { names, phones } = getNamesAndPhonesForUser(mappedUser);

                // Delete members from the members table
                const { data: allMembers, error: memFetchErr } = await supabase
                    .from('members')
                    .select('id, name, phone');

                if (!memFetchErr && allMembers) {
                    const idsToDelete = allMembers
                        .filter(m => {
                            const nameLower = m.name?.toLowerCase().trim();
                            const nameNoAccents = nameLower ? nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
                            const phoneTrim = m.phone?.trim() || '';

                            const matchesName = names.has(nameLower) || names.has(nameNoAccents);
                            const matchesPhone = phoneTrim && phones.has(phoneTrim);

                            return matchesName || matchesPhone;
                        })
                        .map(m => m.id);

                    if (idsToDelete.length > 0) {
                        const { error: memDelErr } = await supabase
                            .from('members')
                            .delete()
                            .in('id', idsToDelete);
                        if (memDelErr) console.error('Failed to delete associated members:', memDelErr);
                    }
                }
            }

            await fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert(`Error al eliminar usuario del sistema: ${err.message || err}`);
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

            return { success: true };
        } catch (err) {
            console.error('Join account error:', err);
            return { success: false, error: err.message || 'Connection error' };
        }
    };

    const leaveAccount = async (accountId) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            const cleanAccountId = accountId.trim().toUpperCase();
            const memberships = (currentUser.memberships || []).filter(m => m.id !== cleanAccountId);

            const { error: updErr } = await supabase
                .from('users')
                .update({ memberships })
                .eq('uid', currentUser.uid);

            if (updErr) throw updErr;

            // Cascade delete this user from the members table of that account
            const namesToDelete = new Set();
            const phonesToDelete = new Set();

            if (currentUser.username) {
                namesToDelete.add(currentUser.username.toLowerCase().trim());
            }

            const targetMembership = (currentUser.memberships || []).find(m => m.id === cleanAccountId);
            if (targetMembership) {
                if (targetMembership.fullName) namesToDelete.add(targetMembership.fullName.toLowerCase().trim());
                if (targetMembership.phone) phonesToDelete.add(targetMembership.phone.trim());
            }

            const { data: allMembers, error: memFetchErr } = await supabase
                .from('members')
                .select('id, name, phone')
                .eq('account_id', cleanAccountId);

            if (!memFetchErr && allMembers) {
                const idsToDelete = allMembers
                    .filter(m => {
                        const nameLower = m.name?.toLowerCase().trim();
                        const phoneTrim = m.phone?.trim() || '';
                        const matchesName = namesToDelete.has(nameLower);
                        const matchesPhone = phoneTrim && phonesToDelete.has(phoneTrim);
                        return matchesName || matchesPhone;
                    })
                    .map(m => m.id);

                if (idsToDelete.length > 0) {
                    await supabase
                        .from('members')
                        .delete()
                        .in('id', idsToDelete);
                }
            }

            // Update local state
            const updatedUser = { ...currentUser, memberships };
            setCurrentUser(updatedUser);

            // Switch active account if we left the current active one
            if (activeAccountId === cleanAccountId) {
                const nextActiveId = memberships[0]?.id || null;
                setActiveAccountId(nextActiveId);
            }

            await fetchUsers();
            return { success: true };
        } catch (err) {
            console.error('Leave account error:', err);
            return { success: false, error: err.message || 'Connection error' };
        }
    };

    const updateMembershipRole = async (targetUid, accountId, role, expiresAt) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            // Check if current user is master or super admin of this account
            const isSuperAdmin = currentUser.username?.toLowerCase().trim() === 'keylet';
            const myMembership = currentUser.memberships?.find(m => m.id === accountId);
            if (!isSuperAdmin && !currentUser.isMaster && myMembership?.role !== 'master') {
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
            let memberships = [...(targetUser.memberships || [])];

            if (role === 'remove') {
                memberships = memberships.filter(m => m.id !== accountId);
            } else {
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
            }

            const { error: updErr } = await supabase
                .from('users')
                .update({ memberships })
                .eq('uid', targetUid);

            if (updErr) throw updErr;

            // Cascade delete members matching this user in members table for this account
            if (role === 'remove') {
                const { names, phones } = getNamesAndPhonesForUser(targetUser);

                const { data: allMembers } = await supabase
                    .from('members')
                    .select('id, name, phone')
                    .eq('account_id', accountId);

                if (allMembers) {
                    const idsToDelete = allMembers
                        .filter(m => {
                            const nameLower = m.name?.toLowerCase().trim();
                            const nameNoAccents = nameLower ? nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
                            const phoneTrim = m.phone?.trim() || '';

                            const matchesName = names.has(nameLower) || names.has(nameNoAccents);
                            const matchesPhone = phoneTrim && phones.has(phoneTrim);

                            return matchesName || matchesPhone;
                        })
                        .map(m => m.id);

                    if (idsToDelete.length > 0) {
                        await supabase.from('members').delete().in('id', idsToDelete);
                    }
                }
            }

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

    const canCreateTemplate = () => {
        if (!currentUser) return false;
        if (currentUser.isMaster) return true;
        // User's own primary church always allows template creation
        if (activeAccountId === currentUser.accountId) return true;
        const membership = currentUser.memberships?.find(m => m.id === activeAccountId);
        if (!membership) return false;
        if (membership.role === 'viewer') return false;
        return membership.role === 'master' || membership.role === 'editor';
    };

    const createChurch = async (churchName) => {
        if (!currentUser) return { success: false, error: 'Not logged in' };
        try {
            const finalAccountId = crypto.randomUUID ? crypto.randomUUID().substring(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 10).toUpperCase();

            // Insert metadata template row
            const metadataTemplateId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            const metadataRow = {
                id: metadataTemplateId,
                account_id: finalAccountId,
                name: '__church_metadata__',
                custom_fields: [`__church_name:${churchName.trim()}`, `__creator_uid:${currentUser.uid}`, `__creator_username:${currentUser.username}`],
                created_at: new Date().toISOString()
            };
            const { error: metaErr } = await supabase.from('templates').insert([metadataRow]);
            if (metaErr) throw metaErr;

            // Update user's memberships
            const memberships = [...(currentUser.memberships || [])];
            memberships.push({
                id: finalAccountId,
                role: 'master',
                expiresAt: null,
                fullName: currentUser.username,
                phone: '',
                email: currentUser.username
            });

            const { error: updErr } = await supabase
                .from('users')
                .update({ memberships })
                .eq('uid', currentUser.uid);

            if (updErr) throw updErr;

            const updatedUser = { ...currentUser, memberships };
            setCurrentUser(updatedUser);
            setActiveAccountId(finalAccountId);

            await fetchUsers();
            return { success: true };
        } catch (err) {
            console.error('Create church error:', err);
            return { success: false, error: err.message || 'Connection error' };
        }
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
        canCreateTemplate: canCreateTemplate(),
        loading,
        users,
        signup,
        login,
        logout,
        joinAccount,
        leaveAccount,
        createChurch,
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
