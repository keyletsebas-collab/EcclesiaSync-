import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const StorageContext = createContext();

// Production URL on Vercel — keep in sync with AuthContext.jsx
const VERCEL_PRODUCTION_URL = 'https://churchmanager-six.vercel.app';

const getApiUrl = () => {
    if (typeof window === 'undefined') return 'http://127.0.0.1:3001';

    // Capacitor (Android/iOS native WebView) — always use production Vercel URL
    if (
        window.Capacitor ||
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'ionic:' ||
        (window.location.hostname === 'localhost' && /Android|iPhone|iPad/i.test(window.navigator?.userAgent || ''))
    ) {
        return VERCEL_PRODUCTION_URL;
    }

    // Deployed on Vercel or any real web host — use same-origin (relative API calls)
    if (
        window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' &&
        !window.location.hostname.startsWith('192.168.')
    ) {
        return window.location.origin;
    }

    // Local development fallback
    const hostname = window.location.hostname || '127.0.0.1';
    return `http://${hostname}:3001`;
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
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    
    // Cooldown trackers
    const lastAddTemplateNameRef = useRef('');
    const lastAddTemplateTimeRef = useRef(0);

    const fetchData = async () => {
        if (!accountId) return;
        setLoading(true);
        console.log('🔄 [LuminaSync] Conectando a la base de datos Supabase...');

        const safeFetch = async (url, defaultVal) => {
            try {
                const res = await fetch(url, { headers: { 'X-User-Uid': currentUser?.uid || '' } });
                if (!res.ok) {
                    const errText = await res.text();
                    console.warn(`⚠️ [LuminaSync] Error de conexión al consultar ${url}:`, errText);
                    return defaultVal;
                }
                const data = await res.json();
                return Array.isArray(data) ? data : defaultVal;
            } catch (err) {
                console.error(`❌ [LuminaSync] Excepción al conectar con ${url}:`, err.message);
                return defaultVal;
            }
        };

        try {
            const [tData, mData, sData, pData] = await Promise.all([
                safeFetch(`${API_URL}/api/templates?accountId=${accountId}`, []),
                safeFetch(`${API_URL}/api/members?accountId=${accountId}`, []),
                safeFetch(`${API_URL}/api/services?accountId=${accountId}`, []),
                safeFetch(`${API_URL}/api/programs?accountId=${accountId}`, [])
            ]);

            console.log('✅ [LuminaSync] Conexión a Supabase establecida. Resumen:', {
                plantillas: tData.length,
                miembros: mData.length,
                servicios: sData.length,
                programas: pData.length
            });

            setTemplates(tData);
            setMembers(mData);
            setServices(sData);
            setPrograms(pData);
        } catch (err) {
            console.error('❌ [LuminaSync] Error general de carga de datos:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        if (!currentUser) {
            setTemplates([]);
            setMembers([]);
            setServices([]);
            setPrograms([]);
            setLoading(false);
            return;
        }
        fetchData();
    }, [accountId, currentUser?.uid]);

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
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
                            console.log('🔄 Realtime Member change:', payload);
                            fetchData();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
                            console.log('🔄 Realtime Service change:', payload);
                            fetchData();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, (payload) => {
                            console.log('🔄 Realtime Template change:', payload);
                            fetchData();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, (payload) => {
                            console.log('🔄 Realtime Program change:', payload);
                            fetchData();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                            console.log('🔄 Realtime Transaction change:', payload);
                            fetchData();
                        })
                        .subscribe((status) => {
                            console.log('📡 Realtime subscription status:', status);
                        });
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

    const addService = async (templateId, memberId, memberName, serviceDate, serviceType = '', program = '', assignedMembers = []) => {
        const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newService = { id: tempId, templateId, memberId, accountId, memberName, serviceDate, serviceType, program, assignedMembers, createdAt: new Date().toISOString() };
        
        setServices(prev => [...prev, newService]);

        try {
            const res = await fetch(`${API_URL}/api/services`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ id: tempId, templateId, memberId, accountId, memberName, serviceDate, serviceType, program, assignedMembers, uid: currentUser?.uid })
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

    // ── Program Actions ───────────────────────────────────────────────────────

    const addProgram = async (templateId, programData) => {
        const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newProgram = { id: tempId, templateId, accountId, title: programData.title, content: programData.content, createdAt: new Date().toISOString() };
        
        setPrograms(prev => [...prev, newProgram]);

        try {
            const res = await fetch(`${API_URL}/api/programs`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Uid': currentUser?.uid || ''
                },
                body: JSON.stringify({ id: tempId, templateId, accountId, title: programData.title, content: programData.content, uid: currentUser?.uid })
            });
            const saved = await res.json();
            setPrograms(prev => prev.map(p => p.id === tempId ? saved : p));
        } catch (err) {
            console.error('Failed to add program:', err);
            fetchData();
        }
    };

    const deleteProgram = async (id) => {
        setPrograms(prev => prev.filter(p => p.id !== id));
        try {
            await fetch(`${API_URL}/api/programs/${id}?uid=${currentUser?.uid}`, { 
                method: 'DELETE',
                headers: { 'X-User-Uid': currentUser?.uid || '' }
            });
        } catch (err) {
            console.error('Failed to delete program:', err);
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
        programs,
        addProgram,
        deleteProgram,
        refreshData: fetchData
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
};
