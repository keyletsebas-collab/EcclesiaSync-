import React, { useState, useEffect } from 'react';
import { useStorage } from '../context/StorageContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
    Scroll, Users, Calendar, BookOpen, HelpCircle, 
    Mic, Volume2, ShieldAlert, Clock, MapPin, 
    FileText, Sparkles, X, Eye, ChevronRight
} from 'lucide-react';
import Modal from './Modal';

const HistoryView = () => {
    const { templates, members, services, programs, loading } = useStorage();
    const { t } = useLanguage();
    const { activeAccountId, currentUser } = useAuth();

    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [churchName, setChurchName] = useState('');
    const [selectedPoem, setSelectedPoem] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('miembros'); // Sub-tabs for template details

    // Filter accessible templates for current user and church account
    const activeMembership = (currentUser?.memberships || []).find(m => m.id === activeAccountId || m.id === currentUser?.accountId);
    const userRole = activeMembership?.role || (currentUser?.isMaster ? 'master' : 'editor');
    const isMasterOrEditor = currentUser?.isMaster || userRole === 'master' || userRole === 'admin' || userRole === 'editor';

    const userNames = [
        currentUser?.username,
        currentUser?.name,
        ...(currentUser?.memberships || []).map(m => m.fullName || m.name)
    ].filter(Boolean).map(n => String(n).toLowerCase().trim());

    const isUserMemberOfTemplate = (templateId) => {
        if (isMasterOrEditor) return true;
        const templateMembers = (members || []).filter(m => String(m.templateId || m.template_id) === String(templateId));
        return templateMembers.some(m => userNames.includes(String(m.name || '').toLowerCase().trim()));
    };

    const accessibleTemplates = (templates || [])
        .filter(t => t.name !== '__church_metadata__')
        .filter(t => isUserMemberOfTemplate(t.id));

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

    // Automatically select first accessible template
    useEffect(() => {
        if (accessibleTemplates.length > 0) {
            const exists = accessibleTemplates.some(t => t.id === selectedTemplateId);
            if (!selectedTemplateId || !exists) {
                setSelectedTemplateId(accessibleTemplates[0].id);
            }
        } else {
            setSelectedTemplateId('');
        }
    }, [accessibleTemplates, selectedTemplateId]);

    // Reset sub-tab when selected template changes
    useEffect(() => {
        if (selectedTemplateId) {
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

    const isDiaconos = !isPoetry && !isSonido;

    // Filter data specifically for the SINGLE selected template
    const templateMembers = (members || []).filter(m => m.templateId === selectedTemplateId || m.template_id === selectedTemplateId);
    const templateServices = (services || []).filter(s => s.templateId === selectedTemplateId || s.template_id === selectedTemplateId);
    const templatePrograms = (programs || []).filter(p => p.templateId === selectedTemplateId || p.template_id === selectedTemplateId);

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

    // Specific subsets for Poesía
    const poetryMembers = templateMembers.filter(m => m.identifications?.isParticipant === true);
    const poems = templateMembers.filter(m => !m.identifications?.isParticipant || !!m.identifications?.content);

    const poetryRehearsals = [
        ...meetingSchedules.map(sch => ({ type: 'Horario Programado', detail: `${sch.days || sch.day || 'Día de ensayo'} a las ${sch.time || 'Horario no especificado'}`, isSchedule: true })),
        ...templateServices.map(s => ({
            type: s.service_type || s.serviceType || 'Ensayo General',
            detail: s.program || 'Ensayo de poesía',
            date: s.service_date || s.serviceDate,
            member: s.member_name || s.memberName
        }))
    ];

    const poetryOutings = templateServices.length > 0 ? templateServices : [];

    // Specific subsets for Sonido
    const sonidoReuniones = [
        ...meetingSchedules.map(sch => ({ type: 'Reunión de Personal', detail: `${sch.days || sch.day || 'Día'} a las ${sch.time || 'Horario'}`, isSchedule: true })),
        ...templateServices.map(s => ({
            type: s.service_type || s.serviceType || 'Reunión Técnica',
            detail: s.program || 'Reunión de equipo',
            date: s.service_date || s.serviceDate,
            member: s.member_name || s.memberName
        }))
    ];

    // Specific subsets for Diáconos
    const diaconosReuniones = [
        ...meetingSchedules.map(sch => ({ type: 'Reunión de Personal', detail: `${sch.days || sch.day || 'Día'} a las ${sch.time || 'Horario'}`, isSchedule: true })),
        ...templateServices.map(s => ({
            type: s.service_type || s.serviceType || 'Reunión de Diaconado',
            detail: s.program || 'Reunión de personal',
            date: s.service_date || s.serviceDate,
            member: s.member_name || s.memberName
        }))
    ];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', padding: '1rem' }}>
            {/* Header */}
            <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Scroll size={28} color="var(--primary)" /> Historial de Plantilla
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
                    Consulta los registros y datos exclusivos de tus plantillas activas de la iglesia adventista: <strong style={{ color: 'var(--primary)' }}>{churchName || activeAccountId}</strong>
                </p>
            </div>

            {/* If user has no access to templates */}
            {accessibleTemplates.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                    <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Acceso Restringido</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        No tienes acceso a ninguna plantilla o no cuentas con los permisos necesarios para consultar sus registros. Contacta al administrador de la iglesia para obtener acceso.
                    </p>
                </div>
            ) : (
                <>
                    {/* Template Selector Bar (One template at a time) */}
                    <div className="glass-panel" style={{ padding: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                            Selecciona la Plantilla a Inspeccionar (Una a la vez)
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {accessibleTemplates.map(t => {
                                const isSel = t.id === selectedTemplateId;
                                const isPo = t.customFields?.includes('__poetry__') || t.name?.toLowerCase().includes('poesia') || t.name?.toLowerCase().includes('poesía');
                                const isSo = t.customFields?.includes('__sonido__') || t.name?.toLowerCase().includes('sonido') || t.name?.toLowerCase().includes('audio');
                                
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplateId(t.id)}
                                        className={`btn ${isSel ? 'btn-primary' : ''}`}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            fontSize: '0.9rem',
                                            fontWeight: isSel ? 700 : 500,
                                            background: isSel ? '' : 'rgba(255,255,255,0.03)',
                                            border: isSel ? '' : '1px solid var(--border)',
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

                    {/* Selected Template Header & Sub-Navigation */}
                    {selectedTemplate && (
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                                        {isPoetry ? '🎭 Plantilla de Poesía' : isSonido ? '🔊 Plantilla de Sonido' : '⛪ Plantilla de Diáconos / Cultos'}
                                    </span>
                                    <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.4rem', fontWeight: 800 }}>
                                        {selectedTemplate.name}
                                    </h3>
                                </div>

                                {/* Sub Tabs Selector based on template type */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '0.35rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                    {isPoetry && (
                                        <>
                                            <button onClick={() => setActiveSubTab('miembros')} className={`btn ${activeSubTab === 'miembros' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                👥 Miembros ({poetryMembers.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('poesias')} className={`btn ${activeSubTab === 'poesias' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                📜 Poesías ({poems.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('programas')} className={`btn ${activeSubTab === 'programas' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                📋 Programas ({templatePrograms.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('ensayos')} className={`btn ${activeSubTab === 'ensayos' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                📢 Ensayos ({poetryRehearsals.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('salidas')} className={`btn ${activeSubTab === 'salidas' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                🚌 Salidas ({poetryOutings.length})
                                            </button>
                                        </>
                                    )}

                                    {isSonido && (
                                        <>
                                            <button onClick={() => setActiveSubTab('miembros')} className={`btn ${activeSubTab === 'miembros' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                👥 Miembros ({templateMembers.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('turnos')} className={`btn ${activeSubTab === 'turnos' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                ⏱️ Turnos ({templateServices.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('reuniones')} className={`btn ${activeSubTab === 'reuniones' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                🤝 Reuniones ({sonidoReuniones.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('programas')} className={`btn ${activeSubTab === 'programas' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                📋 Programas ({templatePrograms.length})
                                            </button>
                                        </>
                                    )}

                                    {isDiaconos && (
                                        <>
                                            <button onClick={() => setActiveSubTab('cultos')} className={`btn ${activeSubTab === 'cultos' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                🗓️ Cronograma de Cultos ({templateServices.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('programas')} className={`btn ${activeSubTab === 'programas' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                📋 Programas ({templatePrograms.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('miembros')} className={`btn ${activeSubTab === 'miembros' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                👥 Miembros ({templateMembers.length})
                                            </button>
                                            <button onClick={() => setActiveSubTab('reuniones')} className={`btn ${activeSubTab === 'reuniones' ? 'btn-primary' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                                🤝 Reuniones de Personal ({diaconosReuniones.length})
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Dynamic Content Display based on Sub Tab */}
                            <div style={{ minHeight: '300px' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                                        <div className="spinner" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
                                        <p style={{ color: 'var(--text-muted)' }}>Cargando datos...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* POESÍA: MIEMBROS */}
                                        {isPoetry && activeSubTab === 'miembros' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {poetryMembers.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay miembros registrados en este grupo de poesía.</p>
                                                ) : (
                                                    poetryMembers.map(m => (
                                                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{m.name}</h4>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {m.phone || 'Sin contacto'}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* POESÍA: POESÍAS (Nombres e interacción de lectura) */}
                                        {isPoetry && activeSubTab === 'poesias' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {poems.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay poesías registradas en esta biblioteca.</p>
                                                ) : (
                                                    poems.map(poem => (
                                                        <div 
                                                            key={poem.id} 
                                                            onClick={() => setSelectedPoem(poem)}
                                                            className="glass-panel"
                                                            style={{ 
                                                                padding: '1.25rem', 
                                                                border: '1px solid var(--border)', 
                                                                cursor: 'pointer',
                                                                transition: 'transform 0.2s, border-color 0.2s',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '0.5rem'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.borderColor = 'var(--primary)';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.transform = 'none';
                                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                                    📖 {poem.name}
                                                                </h4>
                                                                <ChevronRight size={18} color="var(--text-muted)" />
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                Autor / Recitador: <strong style={{ color: 'var(--text-main)' }}>{poem.phone || 'Anónimo'}</strong>
                                                            </p>
                                                            {poem.identifications?.isDigitized && (
                                                                <span style={{ fontSize: '0.65rem', background: 'rgba(253, 224, 71, 0.15)', color: '#fde047', padding: '0.15rem 0.4rem', borderRadius: '4px', alignSelf: 'flex-start', border: '1px solid rgba(253, 224, 71, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                                    <Sparkles size={10} /> OCR IA
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* POESÍA: ENSAYOS */}
                                        {isPoetry && activeSubTab === 'ensayos' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {poetryRehearsals.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay ensayos registrados.</p>
                                                ) : (
                                                    poetryRehearsals.map((reh, idx) => (
                                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 700 }}>📢 {reh.type}</span>
                                                            <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>{reh.detail}</h4>
                                                            {reh.date && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {reh.date} {reh.member ? `| Participante: ${reh.member}` : ''}</p>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* POESÍA: SALIDAS */}
                                        {isPoetry && activeSubTab === 'salidas' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {poetryOutings.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay salidas registradas.</p>
                                                ) : (
                                                    poetryOutings.map(s => (
                                                        <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>🚌 {s.service_type || s.serviceType}</span>
                                                            <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>{s.program || 'Salida especial de poesía'}</h4>
                                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {s.service_date || s.serviceDate} | Asignado: {s.member_name || s.memberName}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* SONIDO: MIEMBROS */}
                                        {isSonido && activeSubTab === 'miembros' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {templateMembers.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay técnicos de sonido registrados.</p>
                                                ) : (
                                                    templateMembers.map(m => (
                                                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{m.name}</h4>
                                                                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', fontWeight: 600 }}>
                                                                    🎛️ {m.identifications?.soundRole || 'Consola'}
                                                                </span>
                                                            </div>
                                                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {m.phone || 'Sin contacto'}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* SONIDO: TURNOS */}
                                        {isSonido && activeSubTab === 'turnos' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {templateServices.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay turnos registrados en esta plantilla.</p>
                                                ) : (
                                                    templateServices.map(s => (
                                                        <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.member_name || s.memberName}</h4>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>📅 {s.service_date || s.serviceDate}</span>
                                                            </div>
                                                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Función / Turno: <strong>{s.service_type || s.serviceType}</strong></p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* SONIDO: REUNIONES */}
                                        {isSonido && activeSubTab === 'reuniones' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {sonidoReuniones.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay reuniones agendadas.</p>
                                                ) : (
                                                    sonidoReuniones.map((r, idx) => (
                                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>🤝 {r.type}</span>
                                                            <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>{r.detail}</h4>
                                                            {r.date && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {r.date} {r.member ? `| Responsable: ${r.member}` : ''}</p>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* DIÁCONOS: CRONOGRAMA DE CULTOS */}
                                        {isDiaconos && activeSubTab === 'cultos' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {templateServices.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay cultos o servicios registrados.</p>
                                                ) : (
                                                    templateServices.map(s => (
                                                        <div key={s.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div>
                                                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{s.member_name || s.memberName}</h4>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.service_type || s.serviceType}</span>
                                                                </div>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>📅 {s.service_date || s.serviceDate}</span>
                                                            </div>
                                                            {s.program && <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Programa: {s.program}</p>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* DIÁCONOS: MIEMBROS */}
                                        {isDiaconos && activeSubTab === 'miembros' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {templateMembers.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay diáconos / miembros registrados.</p>
                                                ) : (
                                                    templateMembers.map(m => (
                                                        <div key={m.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{m.name}</h4>
                                                                {m.number && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>#{m.number}</span>}
                                                            </div>
                                                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {m.phone || 'Sin contacto'}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* DIÁCONOS: REUNIONES DE PERSONAL */}
                                        {isDiaconos && activeSubTab === 'reuniones' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                {diaconosReuniones.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay reuniones de personal programadas.</p>
                                                ) : (
                                                    diaconosReuniones.map((r, idx) => (
                                                        <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>🤝 {r.type}</span>
                                                            <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>{r.detail}</h4>
                                                            {r.date && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {r.date} {r.member ? `| Encargado: ${r.member}` : ''}</p>}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* PROGRAMAS COMPARTIDOS (PARA CUALQUIER PLANTILLA) */}
                                        {activeSubTab === 'programas' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                                {templatePrograms.length === 0 ? (
                                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No hay programas registrados en esta plantilla.</p>
                                                ) : (
                                                    templatePrograms.map(p => (
                                                        <div key={p.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>📋 {p.title}</h4>
                                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--text-main)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                {p.content}
                                                            </pre>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal for Interactive Poetry Reading */}
            {selectedPoem && (
                <Modal 
                    isOpen={!!selectedPoem} 
                    onClose={() => setSelectedPoem(null)}
                    title={`📖 ${selectedPoem.name}`}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Autor / Recitador:</span>
                                <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>{selectedPoem.phone || 'Anónimo'}</strong>
                            </div>
                            {selectedPoem.identifications?.isDigitized && (
                                <span style={{ fontSize: '0.7rem', background: 'rgba(253, 224, 71, 0.15)', color: '#fde047', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(253, 224, 71, 0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Sparkles size={12} /> Digitalizado con IA (OCR)
                                </span>
                            )}
                        </div>

                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            maxHeight: '60vh',
                            overflowY: 'auto'
                        }}>
                            <pre style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'Georgia, serif',
                                fontSize: '1.05rem',
                                lineHeight: '1.8',
                                fontStyle: 'italic',
                                color: 'var(--text-main)'
                            }}>
                                {selectedPoem.identifications?.content || 'Sin texto registrado.'}
                            </pre>
                        </div>

                        <button 
                            onClick={() => setSelectedPoem(null)} 
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '0.6rem' }}
                        >
                            Cerrar Lectura
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HistoryView;
