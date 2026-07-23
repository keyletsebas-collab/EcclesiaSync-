import React, { useState, useEffect } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { Sparkles, Scroll, Users, Calendar, Heart, Plus, Shield, ChevronRight } from 'lucide-react';
import { getRandomVerse } from '../utils/bibleVerses';

const DashboardView = ({ onSelectTemplate, onSelectAdmins, onSelectHistory, onOpenNewTemplate }) => {
    const { templates, members, services, updateMember } = useStorage();
    const { currentUser, activeAccountId, canEdit } = useAuth();
    const { t } = useLanguage();
    const [verse] = useState(() => getRandomVerse());
    const [churchName, setChurchName] = useState('');

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

    const isKeylet = currentUser?.username?.toLowerCase() === 'keylet';

    // Stats
    const totalTemplates = templates.length;

    // Filter unique members by name, merging flags (hasKey, needsPrayer) across templates
    const uniqueMembersMap = new Map();
    members.forEach(m => {
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

    const totalMembers = uniqueMembers.length;
    const totalServices = services.length;
    const activePrayerRequests = uniqueMembers.filter(m => m.identifications?.needsPrayer);
    const membersWithKeys = uniqueMembers.filter(m => m.identifications?.hasKey);

    // Get 5 upcoming services
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingServices = services
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
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '100px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        marginBottom: '1rem'
                    }}>
                        <Sparkles size={12} /> Panel de Control VerbumSync
                    </span>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                        ¡Bienvenido, {currentUser?.username || 'Administrador'}!
                    </h1>
                    {churchName && (
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderLeft: '4px solid var(--secondary)',
                        borderRadius: '0 12px 12px 0',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        fontStyle: 'italic',
                        color: 'var(--text-main)'
                    }}>
                        "{verse.text}"
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)', marginTop: '0.5rem', fontStyle: 'normal' }}>
                            — {verse.reference}
                        </span>
                    </div>
                </div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        boxShadow: '0 12px 28px rgba(99, 102, 241, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '80px',
                        height: '80px'
                    }}>
                        <Sparkles size={40} color="white" />
                    </div>
                </div>
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    right: '-20%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
            </div>

            {/* Quick Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {[
                    { label: 'Plantillas Activas', val: totalTemplates, icon: <Scroll size={20} color="var(--primary)" />, color: 'var(--primary)' },
                    { label: 'Miembros Registrados', val: totalMembers, icon: <Users size={20} color="#34d399" />, color: '#34d399' },
                    { label: 'Servicios Programados', val: totalServices, icon: <Calendar size={20} color="#fbbf24" />, color: '#fbbf24' },
                    { label: 'Peticiones de Oración', val: activePrayerRequests.length, icon: <Heart size={20} color="#f87171" />, color: '#f87171' }
                ].map((card, i) => (
                    <div key={i} className="glass-panel" style={{
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderLeft: `4px solid ${card.color}`
                    }}>
                        <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{card.val}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 500 }}>{card.label}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Split view: Prayer requests vs Upcoming services */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {/* Prayer requests panel */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Heart size={18} color="#f87171" /> Peticiones de Oración Activas ({activePrayerRequests.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {activePrayerRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                No hay peticiones de oración activas en este momento.
                            </div>
                        ) : (
                            activePrayerRequests.map(req => {
                                const templateObj = templates.find(t => t.id === (req.templateId || req.template_id));
                                return (
                                    <div key={req.id} style={{
                                        background: 'rgba(239, 68, 68, 0.02)',
                                        border: '1px solid rgba(239, 68, 68, 0.15)',
                                        borderRadius: '12px',
                                        padding: '0.85rem 1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{req.name}</h4>
                                                {templateObj && (
                                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ff8a8a', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                                        📍 {templateObj.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {req.identifications?.familyName ? `👨‍👩‍👧‍👦 Familia ${req.identifications.familyName}` : 'Miembro'}
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
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    color: '#ff8a8a',
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.7rem',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                🙏 Orar por él/ella
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Key Holders panel */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🔑 Control de Llaves ({membersWithKeys.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {membersWithKeys.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                Ningún diácono tiene registrada la llave actualmente.
                            </div>
                        ) : (
                            membersWithKeys.map(member => {
                                const templateObj = templates.find(t => t.id === (member.templateId || member.template_id));
                                return (
                                    <div key={member.id} style={{
                                        background: 'rgba(251, 191, 36, 0.02)',
                                        border: '1px solid rgba(251, 191, 36, 0.15)',
                                        borderRadius: '12px',
                                        padding: '0.85rem 1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{member.name}</h4>
                                                {templateObj && (
                                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 600 }}>
                                                        📍 {templateObj.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {member.phone ? `📞 ${member.phone}` : 'Diácono'}
                                            </p>
                                        </div>
                                        <span style={{
                                            background: 'rgba(251, 191, 36, 0.15)',
                                            color: '#fbbf24',
                                            fontSize: '0.65rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.15rem'
                                        }}>
                                            🔑 Tiene la Llave
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Upcoming services panel */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} color="#fbbf24" /> Próximos Servicios ({upcomingServices.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {upcomingServices.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                No hay servicios programados próximamente.
                            </div>
                        ) : (
                            upcomingServices.map(srv => {
                                const templateObj = templates.find(t => t.id === (srv.templateId || srv.template_id));
                                return (
                                    <div key={srv.id} style={{
                                        background: 'rgba(255, 255, 255, 0.01)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '0.85rem 1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{srv.memberName || srv.member_name}</h4>
                                                {templateObj && (
                                                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 600 }}>
                                                        📍 {templateObj.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--secondary)' }}>
                                                {srv.serviceType || srv.service_type}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            📅 {srv.serviceDate || srv.service_date}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Accesos Rápidos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {canEdit && (
                        <button className="btn" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--border)', color: 'var(--text-main)', justifyContent: 'space-between' }} onClick={onOpenNewTemplate}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><Plus size={16} /> Crear Plantilla</span>
                            <ChevronRight size={14} />
                        </button>
                    )}
                    {totalTemplates > 0 && (
                        <button className="btn" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', color: 'var(--text-main)', justifyContent: 'space-between' }} onClick={onSelectHistory}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><Scroll size={16} /> Ver Historia</span>
                            <ChevronRight size={14} />
                        </button>
                    )}
                    {isKeylet && (
                        <button className="btn" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', color: 'var(--text-main)', justifyContent: 'space-between' }} onClick={onSelectAdmins}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}><Shield size={16} /> Administrar</span>
                            <ChevronRight size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
