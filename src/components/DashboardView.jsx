import React, { useState, useEffect } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { 
    Sparkles, Scroll, Users, Calendar, Heart, Plus, Shield, ChevronRight, 
    BookOpen, Volume2, Key, Layers, Eye, Compass, Radio, MapPin, Feather, Quote
} from 'lucide-react';
import { getRandomVerse } from '../utils/bibleVerses';
import Modal from './Modal';

const DashboardView = ({ onSelectTemplate, onSelectAdmins, onSelectHistory, onOpenNewTemplate }) => {
    const { templates, members, services, programs, updateMember } = useStorage();
    const { currentUser, activeAccountId, canEdit } = useAuth();
    const { t } = useLanguage();
    const [verse] = useState(() => getRandomVerse());
    const [churchName, setChurchName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('all');
    const [activeSubTab, setActiveSubTab] = useState('miembros');
    const [selectedPoem, setSelectedPoem] = useState(null);

    useEffect(() => {
        const fetchChurchName = async () => {
            if (!activeAccountId) return;
            try {
                const { data } = await supabase
                    .from('templates')
                    .select('custom_fields')
                    .eq('account_id', activeAccountId)
                    .eq('name', '__church_metadata__')
                    .maybeSingle();

                if (data) {
                    const nameField = data.custom_fields?.find(f => f.startsWith('__church_name:'));
                    if (nameField) {
                        setChurchName(nameField.replace('__church_name:', ''));
                    }
                } else {
                    setChurchName('');
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchChurchName();
    }, [activeAccountId]);

    // Accessible templates
    const accessibleTemplates = (templates || []).filter(t => t.name !== '__church_metadata__');

    // Check if user is keylet or global master admin
    const isKeylet = currentUser?.username?.toLowerCase().trim() === 'keylet';
    const isMaster = currentUser?.isMaster || currentUser?.is_master || currentUser?.memberships?.some(m => m.role === 'master');
    const canViewGlobalAll = isKeylet || isMaster;

    // Ensure selectedTemplateId is valid
    useEffect(() => {
        if (!canViewGlobalAll && selectedTemplateId === 'all') {
            if (accessibleTemplates.length > 0) {
                setSelectedTemplateId(accessibleTemplates[0].id);
            }
        } else if (selectedTemplateId !== 'all' && !accessibleTemplates.some(t => t.id === selectedTemplateId)) {
            if (canViewGlobalAll) {
                setSelectedTemplateId('all');
            } else if (accessibleTemplates.length > 0) {
                setSelectedTemplateId(accessibleTemplates[0].id);
            }
        }
    }, [accessibleTemplates, selectedTemplateId, canViewGlobalAll]);

    // Reset sub-tab when selected template changes
    useEffect(() => {
        if (selectedTemplateId !== 'all') {
            const t = accessibleTemplates.find(tmpl => tmpl.id === selectedTemplateId);
            const isPo = t?.customFields?.includes('__poetry__') || t?.name?.toLowerCase().includes('poesia') || t?.name?.toLowerCase().includes('poesía');
            if (isPo) {
                setActiveSubTab('poesias');
            } else {
                setActiveSubTab('miembros');
            }
        }
    }, [selectedTemplateId]);

    const selectedTemplate = accessibleTemplates.find(t => t.id === selectedTemplateId);

    // Identify Template Type
    const isPoetry = selectedTemplate?.customFields?.includes('__poetry__') || 
        selectedTemplate?.name?.toLowerCase().includes('poesia') || 
        selectedTemplate?.name?.toLowerCase().includes('poesía');

    const isSonido = selectedTemplate?.customFields?.includes('__sonido__') || 
        selectedTemplate?.name?.toLowerCase().includes('sonido') || 
        selectedTemplate?.name?.toLowerCase().includes('audio');

    const isDiaconos = selectedTemplateId !== 'all' && !isPoetry && !isSonido;

    // Filter members, services and programs based on selected template
    const filteredMembers = selectedTemplateId === 'all'
        ? members
        : members.filter(m => (m.templateId || m.template_id) === selectedTemplateId);

    const filteredServices = selectedTemplateId === 'all'
        ? services
        : services.filter(s => (s.templateId || s.template_id) === selectedTemplateId);

    const filteredPrograms = selectedTemplateId === 'all'
        ? programs
        : programs.filter(p => (p.templateId || p.template_id) === selectedTemplateId);

    // Filter unique members by name for display
    const uniqueMembersMap = new Map();
    filteredMembers.forEach(m => {
        const nameKey = m.name?.toLowerCase().trim();
        if (!nameKey) return;
        if (!uniqueMembersMap.has(nameKey)) {
            uniqueMembersMap.set(nameKey, { ...m, identifications: { ...(m.identifications || {}) } });
        } else {
            const existing = uniqueMembersMap.get(nameKey);
            existing.identifications = {
                ...(existing.identifications || {}),
                ...(m.identifications || {}),
                hasKey: Boolean(existing.identifications?.hasKey || m.identifications?.hasKey),
                needsPrayer: Boolean(existing.identifications?.needsPrayer || m.identifications?.needsPrayer)
            };
        }
    });
    const uniqueMembers = Array.from(uniqueMembersMap.values());

    // Specific subsets for Poesía
    const poetryMembers = filteredMembers.filter(m => m.identifications?.isParticipant === true);
    const poems = filteredMembers.filter(m => !m.identifications?.isParticipant || !!m.identifications?.content);

    // Calculate total actual members depending on selected template type
    const totalMembers = isPoetry 
        ? poetryMembers.length 
        : selectedTemplateId === 'all' 
        ? filteredMembers.filter(m => m.identifications?.isParticipant !== false && !m.identifications?.content).length 
        : filteredMembers.length;

    const totalServices = filteredServices.length;
    const activePrayerRequests = uniqueMembers.filter(m => m.identifications?.needsPrayer);
    const membersWithKeys = uniqueMembers.filter(m => m.identifications?.hasKey);

    // Meeting schedules from customFields
    const meetingSchedulesField = selectedTemplate?.customFields?.find(f => 
        f.startsWith('__staffMeetingSchedules:') || f.startsWith('__rehearsalSchedules:')
    );
    let meetingSchedules = [];
    if (meetingSchedulesField) {
        try {
            const jsonStr = meetingSchedulesField.replace('__staffMeetingSchedules:', '').replace('__rehearsalSchedules:', '');
            meetingSchedules = JSON.parse(jsonStr);
        } catch (e) {
            meetingSchedules = [];
        }
    }

    const poetryRehearsals = [
        ...meetingSchedules.map(sch => ({ type: 'Horario Programado', detail: `${sch.days || sch.day || 'Día de ensayo'} a las ${sch.time || 'Horario'}`, isSchedule: true })),
        ...filteredServices.map(s => ({
            type: s.service_type || s.serviceType || 'Ensayo General',
            detail: s.program || 'Ensayo de poesía',
            date: s.service_date || s.serviceDate,
            member: s.member_name || s.memberName
        }))
    ];

    const poetryOutings = filteredServices;

    // Specific subsets for Sonido
    const sonidoReuniones = [
        ...meetingSchedules.map(sch => ({ type: 'Reunión de Personal', detail: `${sch.days || sch.day || 'Día'} a las ${sch.time || 'Horario'}`, isSchedule: true })),
        ...filteredServices.map(s => ({
            type: s.service_type || s.serviceType || 'Reunión Técnica',
            detail: s.program || 'Reunión de equipo',
            date: s.service_date || s.serviceDate,
            member: s.member_name || s.memberName
        }))
    ];

    // Specific subsets for Diáconos
    const diaconosReuniones = [
        ...meetingSchedules.map(sch => ({ type: 'Reunión de Personal', detail: `${sch.days || sch.day || 'Día'} a las ${sch.time || 'Horario'}`, isSchedule: true })),
        ...filteredServices.map(s => ({
            type: s.service_type || s.serviceType || 'Reunión de Diaconado',
            detail: s.program || 'Reunión de personal',
            date: s.service_date || s.serviceDate,
            member: s.member_name || s.memberName
        }))
    ];

    // Get 5 upcoming services for selected template
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingServices = filteredServices
        .filter(s => (s.serviceDate || s.service_date) >= todayStr)
        .sort((a, b) => (a.serviceDate || a.service_date).localeCompare(b.serviceDate || b.service_date))
        .slice(0, 5);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', overflowY: 'auto', height: '100%' }}>
            {/* Hero Welcome banner */}
            <div className="glass-panel animate-fade-in" style={{
                padding: '2.5rem',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(236, 72, 153, 0.15) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                boxShadow: '0 16px 40px rgba(0,0,0,0.3)'
            }}>
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <span style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                            color: '#a855f7',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '100px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)'
                        }}>
                            <Sparkles size={13} /> Panel de Control VerbumSync
                        </span>
                        {selectedTemplate && (
                            <span style={{
                                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                                color: '#34d399',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '100px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                border: '1px solid rgba(52, 211, 153, 0.4)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: '0 4px 12px rgba(52, 211, 153, 0.2)'
                            }}>
                                📍 Plantilla Activa: {selectedTemplate.name}
                            </span>
                        )}
                    </div>

                    <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.75px', background: 'linear-gradient(to right, #ffffff, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ¡Bienvenido, {currentUser?.username || 'Administrador'}!
                    </h1>
                    {churchName && (
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#818cf8', margin: '0.35rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            ⛪ {churchName}
                        </h4>
                    )}
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '0.75rem' }}>
                        Gestiona los miembros, planifica actividades, digitaliza poemarios y coordina la oración y control de llaves en tiempo real.
                    </p>

                    {/* Bible Verse Section */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem 1.25rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderLeft: '4px solid #f472b6',
                        borderRadius: '0 14px 14px 0',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        fontStyle: 'italic',
                        color: '#f1f5f9',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                    }}>
                        "{verse.text}"
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#f472b6', marginTop: '0.5rem', fontStyle: 'normal' }}>
                            — {verse.reference}
                        </span>
                    </div>
                </div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                        padding: '1.75rem',
                        borderRadius: '24px',
                        boxShadow: '0 14px 32px rgba(168, 85, 247, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '88px',
                        height: '88px'
                    }}>
                        <Sparkles size={44} color="white" />
                    </div>
                </div>
            </div>

            {/* Template Selector Bar for Dashboard */}
            {accessibleTemplates.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Compass size={16} color="#818cf8" /> Selector de Plantilla Única
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        {canViewGlobalAll && (
                            <button
                                onClick={() => setSelectedTemplateId('all')}
                                style={{
                                    padding: '0.65rem 1.2rem',
                                    fontSize: '0.875rem',
                                    fontWeight: selectedTemplateId === 'all' ? 800 : 600,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s ease',
                                    background: selectedTemplateId === 'all' 
                                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                                        : 'rgba(255,255,255,0.04)',
                                    border: selectedTemplateId === 'all' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    boxShadow: selectedTemplateId === 'all' ? '0 6px 20px rgba(99, 102, 241, 0.4)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Layers size={16} /> Toda la Iglesia (Global)
                            </button>
                        )}

                        {accessibleTemplates.map(t => {
                            const isSel = t.id === selectedTemplateId;
                            const isPo = t.customFields?.includes('__poetry__') || t.name?.toLowerCase().includes('poesia') || t.name?.toLowerCase().includes('poesía');
                            const isSo = t.customFields?.includes('__sonido__') || t.name?.toLowerCase().includes('sonido') || t.name?.toLowerCase().includes('audio');

                            const gradientBg = isPo 
                                ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                                : isSo 
                                ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
                                : 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)';

                            const glowShadow = isPo
                                ? '0 6px 20px rgba(236, 72, 153, 0.4)'
                                : isSo
                                ? '0 6px 20px rgba(59, 130, 246, 0.4)'
                                : '0 6px 20px rgba(16, 185, 129, 0.4)';

                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplateId(t.id)}
                                    style={{
                                        padding: '0.65rem 1.2rem',
                                        fontSize: '0.875rem',
                                        fontWeight: isSel ? 800 : 600,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        background: isSel ? gradientBg : 'rgba(255,255,255,0.04)',
                                        border: isSel ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                        color: '#ffffff',
                                        boxShadow: isSel ? glowShadow : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {isPo ? <BookOpen size={16} /> : isSo ? <Volume2 size={16} /> : <Users size={16} />}
                                    {t.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {[
                    { label: selectedTemplateId === 'all' ? 'Plantillas Activas' : 'Plantilla Seleccionada', val: selectedTemplateId === 'all' ? accessibleTemplates.length : 1, icon: <Scroll size={22} color="#a855f7" />, color: '#a855f7' },
                    { label: 'Miembros Registrados', val: totalMembers, icon: <Users size={22} color="#34d399" />, color: '#34d399' },
                    { label: 'Servicios Programados', val: totalServices, icon: <Calendar size={22} color="#fbbf24" />, color: '#fbbf24' },
                    { label: 'Peticiones de Oración', val: activePrayerRequests.length, icon: <Heart size={22} color="#f472b6" />, color: '#f472b6' }
                ].map((card, i) => (
                    <div key={i} className="glass-panel" style={{
                        padding: '1.35rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderLeft: `5px solid ${card.color}`,
                        borderRadius: '16px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}>
                        <div>
                            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff' }}>{card.val}</div>
                            <div style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.2rem', fontWeight: 600 }}>{card.label}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.65rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* IF A SPECIFIC TEMPLATE IS SELECTED (POESÍA, SONIDO, DIÁCONOS): DISPLAY STUNNING PANELS DIRECTLY */}
            {selectedTemplateId !== 'all' && selectedTemplate ? (
                <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.25rem' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isPoetry ? '#f472b6' : isSonido ? '#60a5fa' : '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {isPoetry ? '🎭 Vista Exclusiva de Poesía' : isSonido ? '🔊 Vista Exclusiva de Sonido' : '⛪ Vista Exclusiva de Cultos'}
                            </span>
                            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                                {selectedTemplate.name}
                            </h3>
                        </div>

                        {/* Sub Tabs Selector Pill Container */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.4)', padding: '0.4rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {isPoetry && (
                                <>
                                    <button onClick={() => setActiveSubTab('miembros')} className={`btn ${activeSubTab === 'miembros' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        👥 Miembros ({poetryMembers.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('poesias')} className={`btn ${activeSubTab === 'poesias' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px', background: activeSubTab === 'poesias' ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' : '' }}>
                                        📜 Nombre de Poesías ({poems.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('programas')} className={`btn ${activeSubTab === 'programas' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        📋 Programas ({filteredPrograms.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('ensayos')} className={`btn ${activeSubTab === 'ensayos' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        📢 Ensayos ({poetryRehearsals.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('salidas')} className={`btn ${activeSubTab === 'salidas' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        🚌 Salidas ({poetryOutings.length})
                                    </button>
                                </>
                            )}

                            {isSonido && (
                                <>
                                    <button onClick={() => setActiveSubTab('miembros')} className={`btn ${activeSubTab === 'miembros' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        👥 Miembros ({filteredMembers.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('turnos')} className={`btn ${activeSubTab === 'turnos' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        ⏱️ Turnos ({filteredServices.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('reuniones')} className={`btn ${activeSubTab === 'reuniones' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        🤝 Reuniones ({sonidoReuniones.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('programas')} className={`btn ${activeSubTab === 'programas' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        📋 Programas ({filteredPrograms.length})
                                    </button>
                                </>
                            )}

                            {isDiaconos && (
                                <>
                                    <button onClick={() => setActiveSubTab('cultos')} className={`btn ${activeSubTab === 'cultos' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        🗓️ Cronograma de Cultos ({filteredServices.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('programas')} className={`btn ${activeSubTab === 'programas' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        📋 Programas ({filteredPrograms.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('miembros')} className={`btn ${activeSubTab === 'miembros' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        👥 Miembros ({filteredMembers.length})
                                    </button>
                                    <button onClick={() => setActiveSubTab('reuniones')} className={`btn ${activeSubTab === 'reuniones' ? 'btn-primary' : ''}`} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                        🤝 Reuniones de Personal ({diaconosReuniones.length})
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sub Tab Content */}
                    <div style={{ minHeight: '260px' }}>
                        {/* POESÍA: MIEMBROS */}
                        {isPoetry && activeSubTab === 'miembros' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                {poetryMembers.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay miembros registrados en este grupo de poesía.</p>
                                ) : (
                                    poetryMembers.map(m => (
                                        <div key={m.id} style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(236, 72, 153, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #ec4899', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{m.name}</h4>
                                            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>📞 {m.phone || 'Sin contacto'}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* POESÍA: NOMBRE DE POESÍAS (haz que al tocarlas se abra la poesía) */}
                        {isPoetry && activeSubTab === 'poesias' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: '#f472b6', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Sparkles size={14} /> Toca cualquier título de poesía para abrir la lectura completa en pantalla.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                    {poems.length === 0 ? (
                                        <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay poesías registradas en esta biblioteca.</p>
                                    ) : (
                                        poems.map(poem => (
                                            <div 
                                                key={poem.id} 
                                                onClick={() => setSelectedPoem(poem)}
                                                style={{ 
                                                    padding: '1.35rem', 
                                                    borderRadius: '18px',
                                                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                                                    border: '1px solid rgba(236, 72, 153, 0.3)', 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.25s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.65rem',
                                                    borderLeft: '5px solid #ec4899',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                                    e.currentTarget.style.borderColor = '#ec4899';
                                                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(236, 72, 153, 0.3)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)';
                                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Georgia, serif', fontWeight: 800, color: '#f472b6' }}>
                                                        📖 {poem.name}
                                                    </h4>
                                                    <ChevronRight size={20} color="#f472b6" />
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                    ✍️ Autor / Recitador: <strong style={{ color: '#ffffff' }}>{poem.phone || 'Anónimo'}</strong>
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        ✨ Toca para leer poesía
                                                    </span>
                                                    {poem.identifications?.isDigitized && (
                                                        <span style={{ fontSize: '0.65rem', background: 'rgba(253, 224, 71, 0.2)', color: '#fde047', padding: '0.15rem 0.45rem', borderRadius: '6px', border: '1px solid rgba(253, 224, 71, 0.4)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Sparkles size={11} /> OCR IA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* POESÍA: ENSAYOS */}
                        {isPoetry && activeSubTab === 'ensayos' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {poetryRehearsals.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay ensayos registrados.</p>
                                ) : (
                                    poetryRehearsals.map((reh, idx) => (
                                        <div key={idx} style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #a855f7', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 800 }}>📢 {reh.type}</span>
                                            <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>{reh.detail}</h4>
                                            {reh.date && <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>📅 {reh.date} {reh.member ? `| Participante: ${reh.member}` : ''}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* POESÍA: SALIDAS */}
                        {isPoetry && activeSubTab === 'salidas' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {poetryOutings.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay salidas registradas.</p>
                                ) : (
                                    poetryOutings.map(s => (
                                        <div key={s.id} style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #6366f1', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 800 }}>🚌 {s.service_type || s.serviceType}</span>
                                            <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>{s.program || 'Salida especial de poesía'}</h4>
                                            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>📅 {s.service_date || s.serviceDate} | Asignado: {s.member_name || s.memberName}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* SONIDO: MIEMBROS */}
                        {isSonido && activeSubTab === 'miembros' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                {filteredMembers.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay técnicos de sonido registrados.</p>
                                ) : (
                                    filteredMembers.map(m => (
                                        <div key={m.id} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #3b82f6', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{m.name}</h4>
                                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa', fontWeight: 800 }}>
                                                    🎛️ {m.identifications?.soundRole || 'Consola'}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>📞 {m.phone || 'Sin contacto'}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* SONIDO: TURNOS */}
                        {isSonido && activeSubTab === 'turnos' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {filteredServices.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay turnos registrados en esta plantilla.</p>
                                ) : (
                                    filteredServices.map(s => (
                                        <div key={s.id} style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #06b6d4', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>{s.member_name || s.memberName}</h4>
                                                <span style={{ fontSize: '0.75rem', color: '#22d3ee', fontWeight: 800 }}>📅 {s.service_date || s.serviceDate}</span>
                                            </div>
                                            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Función / Turno: <strong style={{ color: '#ffffff' }}>{s.service_type || s.serviceType}</strong></p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* SONIDO: REUNIONES */}
                        {isSonido && activeSubTab === 'reuniones' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {sonidoReuniones.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay reuniones agendadas.</p>
                                ) : (
                                    sonidoReuniones.map((r, idx) => (
                                        <div key={idx} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #3b82f6', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 800 }}>🤝 {r.type}</span>
                                            <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>{r.detail}</h4>
                                            {r.date && <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>📅 {r.date} {r.member ? `| Responsable: ${r.member}` : ''}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* DIÁCONOS: CRONOGRAMA DE CULTOS */}
                        {isDiaconos && activeSubTab === 'cultos' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {filteredServices.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay cultos o servicios registrados.</p>
                                ) : (
                                    filteredServices.map(s => (
                                        <div key={s.id} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #10b981', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>{s.member_name || s.memberName}</h4>
                                                    <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 800 }}>{s.service_type || s.serviceType}</span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>📅 {s.service_date || s.serviceDate}</span>
                                            </div>
                                            {s.program && <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>Programa: {s.program}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* DIÁCONOS: MIEMBROS */}
                        {isDiaconos && activeSubTab === 'miembros' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                {filteredMembers.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay diáconos / miembros registrados.</p>
                                ) : (
                                    filteredMembers.map(m => (
                                        <div key={m.id} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #10b981', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>{m.name}</h4>
                                                {m.number && <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>#{m.number}</span>}
                                            </div>
                                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>📞 {m.phone || 'Sin contacto'}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* DIÁCONOS: REUNIONES DE PERSONAL */}
                        {isDiaconos && activeSubTab === 'reuniones' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {diaconosReuniones.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay reuniones de personal programadas.</p>
                                ) : (
                                    diaconosReuniones.map((r, idx) => (
                                        <div key={idx} style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1.25rem', borderRadius: '16px', borderLeft: '5px solid #10b981', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 800 }}>🤝 {r.type}</span>
                                            <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>{r.detail}</h4>
                                            {r.date && <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>📅 {r.date} {r.member ? `| Encargado: ${r.member}` : ''}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* PROGRAMAS COMPARTIDOS */}
                        {activeSubTab === 'programas' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {filteredPrograms.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay programas registrados en esta plantilla.</p>
                                ) : (
                                    filteredPrograms.map(p => (
                                        <div key={p.id} className="glass-panel" style={{ padding: '1.35rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'rgba(15, 23, 42, 0.6)' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#818cf8' }}>📋 {p.title}</h4>
                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                {p.content}
                                            </pre>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* GLOBAL SUMMARY PANELS WHEN 'Toda la Iglesia (Global)' IS SELECTED */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {/* Prayer requests panel */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Heart size={20} color="#f472b6" /> Peticiones de Oración Activas ({activePrayerRequests.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {activePrayerRequests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    No hay peticiones de oración activas en este momento.
                                </div>
                            ) : (
                                activePrayerRequests.map(req => {
                                    const templateObj = templates.find(t => t.id === (req.templateId || req.template_id));
                                    return (
                                        <div key={req.id} style={{
                                            background: 'rgba(244, 114, 182, 0.05)',
                                            border: '1px solid rgba(244, 114, 182, 0.2)',
                                            borderRadius: '14px',
                                            padding: '0.9rem 1.1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{req.name}</h4>
                                                    {templateObj && (
                                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(244, 114, 182, 0.2)', color: '#f472b6', border: '1px solid rgba(244, 114, 182, 0.4)', fontWeight: 700 }}>
                                                            📍 {templateObj.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.775rem', color: '#94a3b8' }}>
                                                    Miembro
                                                </p>
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={async () => {
                                                        await updateMember(req.id, {
                                                            identifications: {
                                                                ...(req.identifications || {}),
                                                                needsPrayer: false
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        background: 'rgba(244, 114, 182, 0.15)',
                                                        border: '1px solid rgba(244, 114, 182, 0.3)',
                                                        color: '#f472b6',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        fontWeight: 800
                                                    }}
                                                >
                                                    Atendido
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Control de Llaves Panel */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Key size={20} color="#fbbf24" /> Control de Llaves ({membersWithKeys.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {membersWithKeys.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    Ningún diácono tiene registrada la llave actualmente.
                                </div>
                            ) : (
                                membersWithKeys.map(k => {
                                    const templateObj = templates.find(t => t.id === (k.templateId || k.template_id));
                                    return (
                                        <div key={k.id} style={{
                                            background: 'rgba(251, 191, 36, 0.05)',
                                            border: '1px solid rgba(251, 191, 36, 0.2)',
                                            borderRadius: '14px',
                                            padding: '0.9rem 1.1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>🔑 {k.name}</h4>
                                                    {templateObj && (
                                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.4)', fontWeight: 700 }}>
                                                            📍 {templateObj.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.775rem', color: '#94a3b8' }}>
                                                    📞 {k.phone || 'Sin número registrado'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Upcoming Services panel */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={20} color="#818cf8" /> Próximos Servicios ({upcomingServices.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {upcomingServices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    No hay servicios programados próximamente.
                                </div>
                            ) : (
                                upcomingServices.map(srv => {
                                    const templateObj = templates.find(t => t.id === (srv.templateId || srv.template_id));
                                    return (
                                        <div key={srv.id} style={{
                                            background: 'rgba(99, 102, 241, 0.05)',
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            borderRadius: '14px',
                                            padding: '0.9rem 1.1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{srv.memberName || srv.member_name}</h4>
                                                    {templateObj && (
                                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.4)', fontWeight: 700 }}>
                                                            📍 {templateObj.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.775rem', color: '#94a3b8' }}>
                                                    Función: <strong style={{ color: '#ffffff' }}>{srv.serviceType || srv.service_type}</strong>
                                                </p>
                                            </div>
                                            <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.3rem 0.7rem', borderRadius: '8px' }}>
                                                📅 {srv.serviceDate || srv.service_date}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Navigation Cards */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>Accesos Rápidos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {canEdit && (
                        <button
                            onClick={onOpenNewTemplate}
                            className="glass-panel"
                            style={{
                                padding: '1.1rem 1.35rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: '#ffffff',
                                transition: 'all 0.25s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <Plus size={20} color="#a855f7" />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Crear Plantilla</span>
                            </div>
                            <ChevronRight size={18} color="#94a3b8" />
                        </button>
                    )}

                    <button
                        onClick={onSelectHistory}
                        className="glass-panel"
                        style={{
                            padding: '1.1rem 1.35rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#ffffff',
                            transition: 'all 0.25s ease'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <Scroll size={20} color="#818cf8" />
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ver Historia</span>
                        </div>
                        <ChevronRight size={18} color="#94a3b8" />
                    </button>

                    {canEdit && (
                        <button
                            onClick={onSelectAdmins}
                            className="glass-panel"
                            style={{
                                padding: '1.1rem 1.35rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: '#ffffff',
                                transition: 'all 0.25s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <Shield size={20} color="#34d399" />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Administrar</span>
                            </div>
                            <ChevronRight size={18} color="#94a3b8" />
                        </button>
                    )}
                </div>
            </div>

            {/* Modal for Interactive Poetry Reading on Dashboard */}
            {selectedPoem && (
                <Modal 
                    isOpen={!!selectedPoem} 
                    onClose={() => setSelectedPoem(null)}
                    title={`📖 ${selectedPoem.name}`}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.85rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Autor / Recitador:</span>
                                <strong style={{ fontSize: '1.05rem', color: '#f472b6', fontWeight: 800 }}>{selectedPoem.phone || 'Anónimo'}</strong>
                            </div>
                            {selectedPoem.identifications?.isDigitized && (
                                <span style={{ fontSize: '0.75rem', background: 'rgba(253, 224, 71, 0.2)', color: '#fde047', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(253, 224, 71, 0.4)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Sparkles size={13} /> Digitalizado con IA (OCR)
                                </span>
                            )}
                        </div>

                        <div style={{
                            background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
                            padding: '1.75rem',
                            borderRadius: '16px',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            maxHeight: '65vh',
                            overflowY: 'auto',
                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                            position: 'relative'
                        }}>
                            <Quote size={40} color="rgba(236, 72, 153, 0.15)" style={{ position: 'absolute', top: '15px', right: '15px', pointerEvents: 'none' }} />
                            <pre style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'Georgia, serif',
                                fontSize: '1.15rem',
                                lineHeight: '1.9',
                                fontStyle: 'italic',
                                color: '#f8fafc',
                                position: 'relative',
                                zIndex: 2
                            }}>
                                {selectedPoem.identifications?.content || 'Sin texto registrado.'}
                            </pre>
                        </div>

                        <button 
                            onClick={() => setSelectedPoem(null)} 
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '12px', background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' }}
                        >
                            Cerrar Lectura
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DashboardView;
