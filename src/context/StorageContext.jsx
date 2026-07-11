import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const StorageContext = createContext();

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

export const useStorage = () => {
    return useContext(StorageContext);
};

export const StorageProvider = ({ children, accountId: propAccountId }) => {
    const { currentUser, activeAccountId } = useAuth();
    const accountId = activeAccountId || propAccountId;
    const [templates, setTemplates] = useState([]);
    const [members, setMembers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    
    // Cooldown trackers
    const lastAddTemplateNameRef = useRef('');
    const lastAddTemplateTimeRef = useRef(0);

    const fetchData = async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const [tRes, mRes, sRes] = await Promise.all([
                fetch(`${API_URL}/api/templates?accountId=${accountId}`, { headers: { 'X-User-Uid': currentUser?.uid || '' } }),
                fetch(`${API_URL}/api/members?accountId=${accountId}`, { headers: { 'X-User-Uid': currentUser?.uid || '' } }),
                fetch(`${API_URL}/api/services?accountId=${accountId}`, { headers: { 'X-User-Uid': currentUser?.uid || '' } })
            ]);

            const [tData, mData, sData] = await Promise.all([
                tRes.json(), mRes.json(), sRes.json()
            ]);

            if (Array.isArray(tData)) {
                setTemplates(tData);
            }
            if (Array.isArray(mData)) setMembers(mData);
            if (Array.isArray(sData)) setServices(sData);
        } catch (err) {
            console.error('🔴 Fetch error in StorageContext:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, [accountId]);

    // Realtime Sync Hook
    useEffect(() => {
        if (!accountId) return;

        let channel = null;

        const setupRealtime = async () => {
            try {
                const configRes = await fetch(`${API_URL}/api/config`);
                const config = await configRes.json();
                
                if (config.supabaseUrl && config.supabaseAnonKey) {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
                    
                    channel = supabaseClient.channel(`room-${accountId}`);
                    
                    channel
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `account_id=eq.${accountId}` }, (payload) => {
                            console.log('🔄 Realtime Member change:', payload);
                            fetchData();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'services', filter: `account_id=eq.${accountId}` }, (payload) => {
                            console.log('🔄 Realtime Service change:', payload);
                            fetchData();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'templates', filter: `account_id=eq.${accountId}` }, (payload) => {
                            console.log('🔄 Realtime Template change:', payload);
                            fetchData();
                        })
                        .subscribe();
                }
            } catch (err) {
                console.error('Failed to set up frontend realtime connection:', err);
            }
        };

        setupRealtime();

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
        };
    }, [accountId]);

    // ── Template Actions ──────────────────────────────────────────────────────

    const addTemplate = async (name, customFields = []) => {
        if (isCreatingTemplate) return;
        
        const now = Date.now();
        if (name === lastAddTemplateNameRef.current && now - lastAddTemplateTimeRef.current < 3000) {
            console.warn('⚠️ Prevented duplicate template creation due to cooldown');
            return;
        }
        
        lastAddTemplateNameRef.current = name;
        lastAddTemplateTimeRef.current = now;
        setIsCreatingTemplate(true);

        try {
            const res = await fetch(`${API_URL}/api/templates`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ accountId, name, customFields, uid: currentUser?.uid })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Error del servidor: ${res.status}`);
            }

            const newTemplate = await res.json();
            setTemplates(prev => {
                if (prev.find(t => t.id === newTemplate.id)) return prev;
                return [...prev, newTemplate];
            });
        } catch (err) {
            console.error('Failed to add template:', err);
            throw err;
        } finally {
            setTimeout(() => setIsCreatingTemplate(false), 2000);
        }
    };

    const updateTemplate = async (id, updatedData) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
        try {
            await fetch(`${API_URL}/api/templates/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ ...updatedData, uid: currentUser?.uid })
            });
        } catch (err) {
            console.error('Failed to update template:', err);
            fetchData();
        }
    };

    const deleteTemplate = async (id) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        try {
            await fetch(`${API_URL}/api/templates/${id}?uid=${currentUser?.uid}`, { 
                method: 'DELETE',
                headers: { 'X-User-Uid': currentUser?.uid || '' }
            });
        } catch (err) {
            console.error('Failed to delete template:', err);
            fetchData();
        }
    };

    // ── Member Actions ────────────────────────────────────────────────────────

    const addMember = async (templateId, memberData) => {
        const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newMember = { id: tempId, templateId, accountId, ...memberData, createdAt: new Date().toISOString() };
        
        setMembers(prev => [...prev, newMember]);
        
        try {
            const res = await fetch(`${API_URL}/api/members`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ id: tempId, templateId, accountId, ...memberData, uid: currentUser?.uid })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add member');
            }
            const saved = await res.json();
            setMembers(prev => prev.map(m => m.id === tempId ? saved : m));
        } catch (err) {
            console.error('Failed to add member:', err);
            alert(`Error al unirse: ${err.message}`);
            fetchData();
        }
    };

    const updateMember = async (id, updatedData) => {
        const prevMembers = [...members];
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedData } : m));
        try {
            const res = await fetch(`${API_URL}/api/members/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ ...updatedData, uid: currentUser?.uid })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update member');
            }
        } catch (err) {
            console.error('Failed to update member:', err);
            alert(`Error al actualizar miembro: ${err.message}`);
            setMembers(prevMembers);
        }
    };

    const deleteMember = async (id) => {
        const prevMembers = [...members];
        setMembers(prev => prev.filter(m => m.id !== id));
        try {
            const res = await fetch(`${API_URL}/api/members/${id}?uid=${currentUser?.uid}`, { 
                method: 'DELETE',
                headers: { 'X-User-Uid': currentUser?.uid || '' }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete member');
            }
        } catch (err) {
            console.error('Failed to delete member:', err);
            alert(`Error al eliminar miembro: ${err.message}`);
            setMembers(prevMembers);
        }
    };

    // ── Service Actions ───────────────────────────────────────────────────────

    const addService = async (templateId, memberId, memberName, serviceDate, serviceType = '') => {
        const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newService = { id: tempId, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt: new Date().toISOString() };
        
        setServices(prev => [...prev, newService]);

        try {
            const res = await fetch(`${API_URL}/api/services`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ id: tempId, templateId, memberId, accountId, memberName, serviceDate, serviceType, uid: currentUser?.uid })
            });
            const saved = await res.json();
            setServices(prev => prev.map(s => s.id === tempId ? saved : s));
        } catch (err) {
            console.error('Failed to add service:', err);
            fetchData();
        }
    };

    const updateService = async (id, updatedData) => {
        setServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
        try {
            await fetch(`${API_URL}/api/services/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ ...updatedData, uid: currentUser?.uid })
            });
        } catch (err) {
            console.error('Failed to update service:', err);
            fetchData();
        }
    };

    const deleteService = async (id) => {
        setServices(prev => prev.filter(s => s.id !== id));
        try {
            await fetch(`${API_URL}/api/services/${id}?uid=${currentUser?.uid}`, { 
                method: 'DELETE',
                headers: { 'X-User-Uid': currentUser?.uid || '' }
            });
        } catch (err) {
            console.error('Failed to delete service:', err);
            fetchData();
        }
    };

    const value = {
        templates,
        members,
        services,
        loading,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        addMember,
        updateMember,
        deleteMember,
        addService,
        updateService,
        deleteService,
        refreshData: fetchData
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
};
