import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const StorageContext = createContext();

export const useStorage = () => {
    return useContext(StorageContext);
};

// --- Mapping Helpers (snake_case DB -> camelCase JS) ---

const mapTemplateToObj = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        accountId: row.account_id,
        name: row.name,
        customFields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields || [],
        createdAt: row.created_at
    };
};

const mapMemberToObj = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        accountId: row.account_id,
        name: row.name,
        number: row.number,
        phone: row.phone,
        identifications: typeof row.identifications === 'string' ? JSON.parse(row.identifications) : row.identifications || {},
        createdAt: row.created_at
    };
};

const mapServiceToObj = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        memberId: row.member_id,
        accountId: row.account_id,
        memberName: row.member_name,
        serviceDate: row.service_date,
        serviceType: row.service_type,
        createdAt: row.created_at,
        program: row.program,
        assignedMembers: typeof row.assigned_members === 'string' ? JSON.parse(row.assigned_members) : row.assigned_members || []
    };
};

const mapProgramToObj = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        accountId: row.account_id,
        title: row.title,
        content: row.content,
        createdAt: row.created_at
    };
};

export const StorageProvider = ({ children, accountId: propAccountId }) => {
    const { currentUser, activeAccountId } = useAuth();

    // Helper para generar UUID válidos en cualquier entorno (incluso sin HTTPS)
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            try { return crypto.randomUUID(); } catch(e) {}
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

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

        try {
            const [tRes, mRes, sRes, pRes] = await Promise.all([
                supabase.from('templates').select('*').eq('account_id', accountId),
                supabase.from('members').select('*').eq('account_id', accountId),
                supabase.from('services').select('*').eq('account_id', accountId),
                supabase.from('programs').select('*').eq('account_id', accountId)
            ]);

            if (tRes.error) console.error('Templates fetch error:', tRes.error);
            if (mRes.error) console.error('Members fetch error:', mRes.error);
            if (sRes.error) console.error('Services fetch error:', sRes.error);
            if (pRes.error) console.error('Programs fetch error:', pRes.error);

            const tData = (tRes.data || []).filter(t => t.name !== '__church_metadata__').map(mapTemplateToObj);
            const mData = (mRes.data || []).map(mapMemberToObj);
            const sData = (sRes.data || []).map(mapServiceToObj);
            const pData = (pRes.data || []).map(mapProgramToObj);

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
                channel = supabase.channel(`room-${accountId}`);
                
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
            const newId = generateUUID();
            const newTemplateRow = {
                id: newId,
                account_id: accountId,
                name,
                custom_fields: customFields,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('templates').insert([newTemplateRow]);
            if (error) throw error;

            setTemplates(prev => {
                if (prev.find(t => t.id === newId)) return prev;
                return [...prev, mapTemplateToObj(newTemplateRow)];
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
            const dbUpdates = {};
            if (updatedData.name !== undefined) dbUpdates.name = updatedData.name;
            if (updatedData.customFields !== undefined) dbUpdates.custom_fields = updatedData.customFields;
            if (updatedData.accountId !== undefined) dbUpdates.account_id = updatedData.accountId;

            const { error } = await supabase
                .from('templates')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to update template:', err);
            fetchData();
        }
    };

    const deleteTemplate = async (id) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to delete template:', err);
            fetchData();
        }
    };

    // ── Member Actions ────────────────────────────────────────────────────────

    const addMember = async (templateId, memberData) => {
        const tempId = generateUUID();
        const newMemberRow = {
            id: tempId,
            template_id: templateId,
            account_id: accountId,
            name: memberData.name,
            number: (memberData.number === '' || memberData.number === null || memberData.number === undefined) ? 0 : parseInt(memberData.number, 10),
            phone: memberData.phone || '',
            identifications: memberData.identifications || {},
            created_at: new Date().toISOString()
        };
        
        setMembers(prev => [...prev, mapMemberToObj(newMemberRow)]);
        
        try {
            const { error } = await supabase.from('members').insert([newMemberRow]);
            if (error) throw error;
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
            const dbUpdates = {};
            if (updatedData.templateId !== undefined) dbUpdates.template_id = updatedData.templateId;
            if (updatedData.accountId !== undefined) dbUpdates.account_id = updatedData.accountId;
            if (updatedData.name !== undefined) dbUpdates.name = updatedData.name;
            if (updatedData.number !== undefined) {
                dbUpdates.number = (updatedData.number === '' || updatedData.number === null || updatedData.number === undefined) ? 0 : parseInt(updatedData.number, 10);
            }
            if (updatedData.phone !== undefined) dbUpdates.phone = updatedData.phone;
            if (updatedData.identifications !== undefined) dbUpdates.identifications = updatedData.identifications;

            const { error } = await supabase
                .from('members')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
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
            const { error } = await supabase
                .from('members')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to delete member:', err);
            alert(`Error al eliminar miembro: ${err.message}`);
            setMembers(prevMembers);
        }
    };

    // ── Service Actions ───────────────────────────────────────────────────────

    const addService = async (templateId, memberId, memberName, serviceDate, serviceType = '', program = '', assignedMembers = []) => {
        const tempId = generateUUID();
        const newServiceRow = {
            id: tempId,
            template_id: templateId,
            member_id: memberId,
            account_id: accountId,
            member_name: memberName,
            service_date: serviceDate,
            service_type: serviceType,
            program,
            assigned_members: assignedMembers,
            created_at: new Date().toISOString()
        };
        
        setServices(prev => [...prev, mapServiceToObj(newServiceRow)]);

        try {
            const { error } = await supabase.from('services').insert([newServiceRow]);
            if (error) throw error;
        } catch (err) {
            console.error('Failed to add service:', err);
            alert(`Error al guardar salida: ${err.message}. (Verifica tu esquema de base de datos)`);
            fetchData();
        }
    };

    const updateService = async (id, updatedData) => {
        setServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
        try {
            const dbUpdates = {};
            if (updatedData.templateId !== undefined) dbUpdates.template_id = updatedData.templateId;
            if (updatedData.memberId !== undefined) dbUpdates.member_id = updatedData.memberId;
            if (updatedData.accountId !== undefined) dbUpdates.account_id = updatedData.accountId;
            if (updatedData.memberName !== undefined) dbUpdates.member_name = updatedData.memberName;
            if (updatedData.serviceDate !== undefined) dbUpdates.service_date = updatedData.serviceDate;
            if (updatedData.serviceType !== undefined) dbUpdates.service_type = updatedData.serviceType;
            if (updatedData.program !== undefined) dbUpdates.program = updatedData.program;
            if (updatedData.assignedMembers !== undefined) dbUpdates.assigned_members = updatedData.assignedMembers;

            const { error } = await supabase
                .from('services')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to update service:', err);
            fetchData();
        }
    };

    const deleteService = async (id) => {
        setServices(prev => prev.filter(s => s.id !== id));
        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to delete service:', err);
            fetchData();
        }
    };

    // ── Program Actions ───────────────────────────────────────────────────────

    const addProgram = async (templateId, programData) => {
        const tempId = generateUUID();
        const newProgramRow = {
            id: tempId,
            template_id: templateId,
            account_id: accountId,
            title: programData.title,
            content: programData.content,
            created_at: new Date().toISOString()
        };
        
        setPrograms(prev => [...prev, mapProgramToObj(newProgramRow)]);

        try {
            const { error } = await supabase.from('programs').insert([newProgramRow]);
            if (error) throw error;
        } catch (err) {
            console.error('Failed to add program:', err);
            fetchData();
        }
    };

    const deleteProgram = async (id) => {
        setPrograms(prev => prev.filter(p => p.id !== id));
        try {
            const { error } = await supabase
                .from('programs')
                .delete()
                .eq('id', id);

            if (error) throw error;
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
