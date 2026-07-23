import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import notificationService from '../utils/NotificationService';

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
    const { currentUser, activeAccountId, users } = useAuth();

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
    const channelRef = useRef(null);

    const processRealtimeService = (service) => {
        if (!service || service.account_id !== accountId) return;

        // Parse serviceType (could be a JSON string like {"type":"Poesía","media":[],"isFinished":true})
        const rawServiceType = service.service_type || 'Servicio';
        let serviceType = rawServiceType;
        let isFinished = false;
        try {
            const parsed = JSON.parse(rawServiceType);
            if (parsed && typeof parsed === 'object') {
                if (parsed.type !== undefined) serviceType = parsed.type;
                if (parsed.isFinished) isFinished = true;
            }
        } catch (e) {}

        if (isFinished) {
            console.log('🚫 Outing/Service program is marked as finished ("Se acabó el programa"). Skipping notifications.');
            return;
        }
        // Parse program (could be a JSON string like {"poems":[],"notes":""})
        const rawProgram = service.program || '';
        let program = rawProgram;
        try {
            const parsed = JSON.parse(rawProgram);
            if (parsed && typeof parsed === 'object') {
                program = parsed.notes || '';
            }
        } catch (e) {}

        const serviceDate = service.service_date || '';
        const assignedMembers = typeof service.assigned_members === 'string'
            ? JSON.parse(service.assigned_members)
            : service.assigned_members || [];
        const lowerType = serviceType.toLowerCase();
        const lowerProgram = program.toLowerCase();
        const template = templates.find(t => t.id === service.template_id);
        const templateName = template ? template.name.toLowerCase() : '';
        const isCampaign = lowerType.includes('campaña') || lowerType.includes('campana') || lowerProgram.includes('campaña') || lowerProgram.includes('campana') || templateName.includes('campaña') || templateName.includes('campana');
        
        const isRehearsal = lowerType.includes('ensayo') || lowerType.includes('ensayos') || lowerType.includes('practica') || lowerType.includes('práctica') || lowerType.includes('practicas') || lowerType.includes('prácticas') || lowerType.includes('ensayar') ||
                            lowerProgram.includes('ensayo') || lowerProgram.includes('ensayos') || lowerProgram.includes('practica') || lowerProgram.includes('práctica') || lowerProgram.includes('practicas') || lowerProgram.includes('prácticas') || lowerProgram.includes('ensayar') ||
                            templateName.includes('ensayo') || templateName.includes('ensayos') || templateName.includes('practica') || templateName.includes('práctica') || templateName.includes('practicas') || templateName.includes('prácticas') || templateName.includes('ensayar');
        
        const isOuting = !isRehearsal && (lowerType.includes('salida') || lowerType.includes('salidas') || lowerProgram.includes('salida') || lowerProgram.includes('salidas') || templateName.includes('salida') || templateName.includes('salidas'));
        
        const isPoetry = lowerType.includes('poesía') || lowerType.includes('poesia') || templateName.includes('poesía') || templateName.includes('poesia');
        const isUserAssigned = assignedMembers?.some(m => m.name?.toLowerCase() === currentUser?.username?.toLowerCase()) || service.member_name?.toLowerCase() === currentUser?.username?.toLowerCase();

        if (isCampaign) {
            const templateObj = templates.find(t => t.id === service.template_id);
            const isSo = templateObj?.customFields?.includes('__sonido__') || templateObj?.name?.toLowerCase().includes('sonido');
            const isPo = templateObj?.customFields?.includes('__poetry__') || templateObj?.name?.toLowerCase().includes('poesia') || templateObj?.name?.toLowerCase().includes('poesía');
            if (isPo) {
                notificationService.notifyPoetryCampaignCreated(serviceType, serviceDate, program);
            } else if (isSo) {
                notificationService.notifySonidoCampaignCreated(serviceType, serviceDate, program);
            } else {
                notificationService.notifyDiaconosCampaignCreated(serviceType, serviceDate, program);
            }
        } else if (isPoetry) {
            notificationService.notifyPoetryCreated(
                serviceType,
                serviceDate,
                service.program
            );
        } else if (isRehearsal) {
            const templateObj = templates.find(t => t.id === service.template_id);
            const isSo = templateObj?.customFields?.includes('__sonido__') || templateObj?.name?.toLowerCase().includes('sonido');
            const isPo = templateObj?.customFields?.includes('__poetry__') || templateObj?.name?.toLowerCase().includes('poesia') || templateObj?.name?.toLowerCase().includes('poesía');
            if (isPo) {
                notificationService.notifyPoetryRehearsalCreated(serviceType, serviceDate);
            } else if (isSo) {
                notificationService.notifySonidoMeetingCreated(serviceType, serviceDate);
            } else {
                notificationService.notifyDiaconosMeetingCreated(serviceType, serviceDate);
            }
        } else if (isOuting) {
            notificationService.notifyRehearsalOrOutingCreated(
                serviceType && !serviceType.toLowerCase().includes('salida') ? `Salida (${serviceType})` : (serviceType || 'Salida'),
                `Fecha: ${serviceDate}. ${program ? `Detalles: ${program}` : ''}`,
                true
            );
        } else {
            notificationService.notifyCampaignOrAssignment({
                serviceDate,
                assignedMembers: assignedMembers || [],
                serviceType,
                program,
                isCampaign
            });
        }
    };

    const processRealtimeProgram = (prog) => {
        if (!prog) return;
        const templateObj = templates.find(t => t.id === prog.template_id);
        const isSo = templateObj?.customFields?.includes('__sonido__') || templateObj?.name?.toLowerCase().includes('sonido');
        const isPo = templateObj?.customFields?.includes('__poetry__') || templateObj?.name?.toLowerCase().includes('poesia') || templateObj?.name?.toLowerCase().includes('poesía');
        if (isPo) {
            notificationService.notifyPoetryProgramCreated(prog.title, prog.content);
        } else if (isSo) {
            notificationService.notifySonidoProgramCreated(prog.title, prog.content);
        } else {
            notificationService.notifyDiaconosProgramCreated(prog.title, prog.content);
        }
    };

    const processRealtimeTemplate = (newTemplateRow) => {
        if (!newTemplateRow) return;

        // Find existing template in state to compare
        const oldTemplate = templates.find(t => t.id === newTemplateRow.id);
        if (!oldTemplate) return;

        // Extract schedules from old and new
        const oldSchedulesField = (oldTemplate.customFields || []).find(f => f && typeof f === 'string' && (f.startsWith('__rehearsalSchedules:') || f.startsWith('__staffMeetingSchedules:')));
        let newCustomFields = [];
        if (typeof newTemplateRow.custom_fields === 'string') {
            try {
                newCustomFields = JSON.parse(newTemplateRow.custom_fields);
            } catch (e) {}
        } else {
            newCustomFields = newTemplateRow.custom_fields || [];
        }
        if (!Array.isArray(newCustomFields)) {
            newCustomFields = [];
        }
        const newSchedulesField = newCustomFields.find(f => f && typeof f === 'string' && (f.startsWith('__rehearsalSchedules:') || f.startsWith('__staffMeetingSchedules:')));

        if (newSchedulesField && newSchedulesField !== oldSchedulesField) {
            try {
                const prefix = newSchedulesField.startsWith('__staffMeetingSchedules:') ? '__staffMeetingSchedules:' : '__rehearsalSchedules:';
                const schedStr = newSchedulesField.replace(prefix, '');
                const validSchedules = JSON.parse(schedStr);
                if (validSchedules && validSchedules.length > 0) {
                    const schedDesc = validSchedules.map(s => `${s.days} a las ${s.time} (${s.modality || 'Presencial'})`).join(', ');
                    const isSo = newTemplateRow.name?.toLowerCase().includes('sonido');
                    const isPo = newTemplateRow.name?.toLowerCase().includes('poesia') || newTemplateRow.name?.toLowerCase().includes('poesía');
                    if (isPo) {
                        notificationService.notifyPoetryRehearsalCreated(schedDesc);
                    } else if (isSo) {
                        notificationService.notifySonidoMeetingCreated(schedDesc);
                    } else {
                        notificationService.notifyDiaconosMeetingCreated(schedDesc);
                    }
                }
            } catch (e) {
                console.error('Error parsing updated rehearsal schedules:', e);
            }
        }
    };
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

            // Check if user was kicked from a template
            if (currentUser && members.length > 0) {
                const activeUserFullName = currentUser?.username?.toLowerCase().trim() || '';
                const userMemberships = currentUser?.memberships?.map(m => m.fullName?.toLowerCase().trim()).filter(Boolean) || [];
                const isUserMatch = (name) => {
                    if (!name) return false;
                    const normalized = name.toLowerCase().trim();
                    return normalized === activeUserFullName || userMemberships.includes(normalized);
                };

                const wasInTemplates = members.filter(m => isUserMatch(m.name)).map(m => m.templateId);
                const nowInTemplates = mData.filter(m => isUserMatch(m.name)).map(m => m.templateId);

                const lostTemplates = wasInTemplates.filter(tid => !nowInTemplates.includes(tid));
                if (lostTemplates.length > 0) {
                    lostTemplates.forEach(tid => {
                        const template = tData.find(t => t.id === tid) || templates.find(t => t.id === tid);
                        const templateName = template?.name || 'una plantilla';
                        notificationService.notifyKickedFromTemplate(templateName);
                    });
                }
            }

            setTemplates(tData);
            setMembers(mData);
            setServices(sData);
            setPrograms(pData);

            if (currentUser) {
                notificationService.syncAllLocalNotifications(currentUser, sData, mData, tData, users || []);
            }
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

    // Auto-sync on app resume / window focus / tab activation
    useEffect(() => {
        const handleFocusOrResume = () => {
            if (currentUser && accountId) {
                console.log('🔄 App resumed / window focused -> Syncing latest data from Supabase...');
                fetchData();
            }
        };

        window.addEventListener('focus', handleFocusOrResume);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleFocusOrResume();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocusOrResume);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [accountId, currentUser?.uid]);

    // Realtime Sync Hook
    useEffect(() => {
        if (!accountId) return;

        let channel = null;

        const setupRealtime = async () => {
            try {
                channel = supabase.channel(`room-${accountId}`);
                channelRef.current = channel;
                channel
                    .on('broadcast', { event: 'test_notification' }, ({ payload }) => {
                        console.log('📢 Realtime Test Notification Broadcast:', payload);
                        notificationService.sendLocalNotification(
                            payload.id || Date.now(),
                            payload.title,
                            payload.body,
                            null,
                            payload.extra || {}
                        );
                    })
                    .on('broadcast', { event: 'real_service_change' }, ({ payload }) => {
                        console.log('📢 Realtime Broadcast Service change:', payload);
                        fetchData();
                        try {
                            if (payload && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
                                processRealtimeService(payload.new);
                            }
                        } catch (e) {
                            console.error('Error processing realtime service broadcast:', e);
                        }
                    })
                    .on('broadcast', { event: 'real_program_change' }, ({ payload }) => {
                        console.log('📢 Realtime Broadcast Program change:', payload);
                        fetchData();
                        try {
                            if (payload && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
                                processRealtimeProgram(payload.new);
                            }
                        } catch (e) {
                            console.error('Error processing realtime program broadcast:', e);
                        }
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
                        console.log('🔄 Realtime Member change:', payload);
                        fetchData();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
                        console.log('🔄 Realtime Service change:', payload);
                        fetchData();
                        try {
                            if (payload && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
                                processRealtimeService(payload.new);
                            }
                        } catch (e) {
                            console.error('Error processing realtime service change:', e);
                        }
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, (payload) => {
                        console.log('🔄 Realtime Template change:', payload);
                        fetchData();
                        try {
                            if (payload && payload.eventType === 'UPDATE') {
                                processRealtimeTemplate(payload.new);
                            }
                        } catch (e) {
                            console.error('Error processing realtime template change:', e);
                        }
                    })
                    .on('broadcast', { event: 'real_template_change' }, ({ payload }) => {
                        console.log('📢 Realtime Broadcast Template change:', payload);
                        fetchData();
                        try {
                            if (payload && payload.eventType === 'UPDATE') {
                                processRealtimeTemplate(payload.new);
                            }
                        } catch (e) {
                            console.error('Error processing realtime template broadcast:', e);
                        }
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, (payload) => {
                        console.log('🔄 Realtime Program change:', payload);
                        fetchData();
                        try {
                            if (payload && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
                                processRealtimeProgram(payload.new);
                            }
                        } catch (e) {
                            console.error('Error processing realtime program change:', e);
                        }
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
            channelRef.current = null;
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
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'real_template_change',
                    payload: { eventType: 'UPDATE', new: { ...dbUpdates, id, account_id: accountId } }
                });
            }
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
        const userCodeInput = memberData.userCode || memberData.identifications?.userCode || '';
        let memberName = memberData.name || '';
        let linkedIdentifications = { ...(memberData.identifications || {}) };

        if (userCodeInput.trim()) {
            const cleanCode = userCodeInput.trim().toUpperCase();
            linkedIdentifications.userCode = cleanCode;

            try {
                const { data: matchedUsers, error: userSearchErr } = await supabase
                    .from('users')
                    .select('*');

                if (!userSearchErr && matchedUsers) {
                    const matchedUserRow = matchedUsers.find(u => {
                        const code = u.user_code || '';
                        return code.toUpperCase() === cleanCode;
                    });

                    if (matchedUserRow) {
                        if (!memberName) {
                            memberName = matchedUserRow.username;
                        }

                        let targetMemberships = typeof matchedUserRow.memberships === 'string'
                            ? JSON.parse(matchedUserRow.memberships)
                            : (matchedUserRow.memberships || []);

                        const existingMemIndex = targetMemberships.findIndex(m => m.id === accountId);

                        if (existingMemIndex >= 0) {
                            const currentMem = targetMemberships[existingMemIndex];
                            const currentAllowed = currentMem.allowedTemplateIds || [];
                            if (!currentAllowed.includes(templateId)) {
                                targetMemberships[existingMemIndex] = {
                                    ...currentMem,
                                    allowedTemplateIds: [...currentAllowed, templateId]
                                };
                            }
                        } else {
                            targetMemberships.push({
                                id: accountId,
                                role: 'viewer',
                                allowedTemplateIds: [templateId],
                                fullName: memberName || matchedUserRow.username,
                                phone: memberData.phone || '',
                                email: matchedUserRow.username
                            });
                        }

                        await supabase
                            .from('users')
                            .update({ memberships: targetMemberships })
                            .eq('uid', matchedUserRow.uid);

                        console.log(`🔗 2º ID vinculado: Otorgado acceso a usuario ${matchedUserRow.username} para la plantilla ${templateId} en la iglesia ${accountId}`);
                    }
                }
            } catch (e) {
                console.error('Error linking member via 2nd ID:', e);
            }
        }

        // Self-unlock template if currentUser is joining a template in this account
        if (currentUser) {
            try {
                const userMemIndex = (currentUser.memberships || []).findIndex(m => m.id === accountId);
                if (userMemIndex >= 0) {
                    const currentMem = currentUser.memberships[userMemIndex];
                    if (currentMem.allowedTemplateIds && Array.isArray(currentMem.allowedTemplateIds)) {
                        if (!currentMem.allowedTemplateIds.includes(templateId)) {
                            const updatedAllowed = [...currentMem.allowedTemplateIds, templateId];
                            const updatedMemberships = [...currentUser.memberships];
                            updatedMemberships[userMemIndex] = {
                                ...currentMem,
                                allowedTemplateIds: updatedAllowed
                            };
                            await supabase
                                .from('users')
                                .update({ memberships: updatedMemberships })
                                .eq('uid', currentUser.uid);
                            console.log(`🔓 Desbloqueada plantilla ${templateId} para el usuario ${currentUser.username}`);
                        }
                    }
                }
            } catch (err) {
                console.error('Error updating allowedTemplateIds for self user:', err);
            }
        }

        const newMemberRow = {
            id: tempId,
            template_id: templateId,
            account_id: accountId,
            name: memberName || 'Miembro',
            number: (memberData.number === '' || memberData.number === null || memberData.number === undefined) ? 0 : parseInt(memberData.number, 10),
            phone: memberData.phone || '',
            identifications: linkedIdentifications,
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
        
        setServices(prev => {
            const updated = [...prev, mapServiceToObj(newServiceRow)];
            if (currentUser) {
                notificationService.syncAllLocalNotifications(currentUser, updated, members, templates, users || []);
            }
            return updated;
        });
        try {
            const { error } = await supabase.from('services').insert([newServiceRow]);
            if (error) throw error;
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'real_service_change',
                    payload: { eventType: 'INSERT', new: newServiceRow }
                });
            }
        } catch (err) {
            console.error('Failed to add service:', err);
            alert(`Error al guardar salida: ${err.message}. (Verifica tu esquema de base de datos)`);
            fetchData();
        }
    };

    const updateService = async (id, updatedData) => {
        setServices(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, ...updatedData } : s);
            if (currentUser) {
                notificationService.syncAllLocalNotifications(currentUser, updated, members, templates, users || []);
            }
            return updated;
        });
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
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'real_service_change',
                    payload: { eventType: 'UPDATE', new: { ...dbUpdates, id, account_id: accountId } }
                });
            }
        } catch (err) {
            console.error('Failed to update service:', err);
            fetchData();
        }
    };

    const deleteService = async (id) => {
        setServices(prev => {
            const updated = prev.filter(s => s.id !== id);
            if (currentUser) {
                notificationService.syncAllLocalNotifications(currentUser, updated, members, templates, users || []);
            }
            return updated;
        });
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
        const template = templates.find(t => t.id === templateId);
        const targetAccountId = template?.accountId || accountId;

        const newProgramRow = {
            id: tempId,
            template_id: templateId,
            account_id: targetAccountId,
            title: programData.title,
            content: programData.content,
            created_at: new Date().toISOString()
        };
        
        setPrograms(prev => [...prev, mapProgramToObj(newProgramRow)]);
        try {
            const { error } = await supabase.from('programs').insert([newProgramRow]);
            if (error) throw error;
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'real_program_change',
                    payload: { eventType: 'INSERT', new: newProgramRow }
                });
            }
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

    const activeMembership = currentUser?.memberships?.find(m => m.id === accountId);
    const allowedTemplateIds = activeMembership?.allowedTemplateIds;

    const visibleTemplates = (templates || []).filter(t => {
        if (t.name === '__church_metadata__') return false;
        if (allowedTemplateIds && Array.isArray(allowedTemplateIds) && allowedTemplateIds.length > 0) {
            return allowedTemplateIds.includes(t.id);
        }
        return true;
    });

    const visibleTemplateIds = new Set(visibleTemplates.map(t => t.id));

    const visibleMembers = (members || []).filter(m => visibleTemplateIds.has(m.templateId || m.template_id));
    const visibleServices = (services || []).filter(s => visibleTemplateIds.has(s.templateId || s.template_id));
    const visiblePrograms = (programs || []).filter(p => visibleTemplateIds.has(p.templateId || p.template_id));

    const value = {
        templates: visibleTemplates,
        allTemplates: templates,
        members: visibleMembers,
        allMembers: members,
        services: visibleServices,
        allServices: services,
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
        programs: visiblePrograms,
        allPrograms: programs,
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
