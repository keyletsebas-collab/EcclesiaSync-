import React, { useState, useEffect } from 'react';
import { useStorage } from '../context/StorageContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Scroll, Users, Calendar, Sparkles, BookOpen, HelpCircle } from 'lucide-react';

const HistoryView = () => {
    const { templates, members, services, loading } = useStorage();
    const { t } = useLanguage();
    const { activeAccountId } = useAuth();
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
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

    // Get selected template details
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const isPoetry = selectedTemplate?.customFields?.includes('__poetry__');

    // Filter members and services for the selected template
    const templateMembers = members.filter(m => m.templateId === selectedTemplateId || m.template_id === selectedTemplateId);
    const templateServices = services.filter(s => s.templateId === selectedTemplateId || s.template_id === selectedTemplateId);

    // Automatically select the first template if none is selected
    useEffect(() => {
        if (templates.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [templates, selectedTemplateId]);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Scroll size={28} color="var(--primary)" /> Historial e Información
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
                        Explora la configuración, miembros y registro de actividades de tus plantillas activas de la iglesia: <strong style={{ color: 'var(--primary)' }}>{churchName || activeAccountId}</strong>
                    </p>
                </div>
            </div>

            {/* Template Selector Dropdown */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Selecciona la Plantilla a Inspeccionar
                    </label>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="glass-input"
                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                    >
                        <option value="">-- Elige una plantilla --</option>
                        {templates.filter(t => t.name !== '__church_metadata__').map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({t.customFields?.includes('__poetry__') ? 'Poesía' : 'Miembros/Diáconos'})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedTemplate && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '0.75rem 1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{templateMembers.length}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                                {isPoetry ? 'Poemas' : 'Miembros'}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '0.75rem 1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>{templateServices.length}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.15rem' }}>
                                Servicios
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedTemplateId ? (
                loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="spinner" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
                        <p style={{ color: 'var(--text-muted)' }}>Cargando registros históricos...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Explanation Card */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)', background: 'rgba(99, 102, 241, 0.03)' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <HelpCircle size={18} color="var(--primary)" /> Tipo de Plantilla Seleccionada
                            </h3>
                            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: 0, color: 'var(--text-main)' }}>
                                {isPoetry ? (
                                    <>
                                        Esta plantilla está configurada como una <strong>Biblioteca de Poesía (Grupo de Poesía)</strong>. 
                                        Se utiliza para catalogar poemas, poemarios y cánticos escritos por miembros del grupo. 
                                        Permite transcribir versos de forma automática utilizando Inteligencia Artificial (OCR), 
                                        organiza la lectura en formato de poemas con fuentes estilizadas, y restringe el panel estándar de familias para concentrar la atención en la literatura del grupo.
                                    </>
                                ) : (
                                    <>
                                        Esta plantilla está configurada como un <strong>Registro de Diáconos / Miembros de la Iglesia (Estándar)</strong>. 
                                        Se utiliza para gestionar de forma completa la membresía, organizar las familias unificando sus miembros 
                                        por apellidos/roles familiares (jefe de familia, cónyuge, hijos), y llevar un control histórico 
                                        de asistencias o asignaciones de servicios ministeriales a través del calendario.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Split views */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                            {/* Members / Poems list */}
                            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isPoetry ? <BookOpen size={18} color="var(--primary)" /> : <Users size={18} color="var(--primary)" />}
                                    {isPoetry ? 'Poemas Registrados' : 'Miembros del Grupo'} ({templateMembers.length})
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {templateMembers.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                                            No hay registros cargados aún.
                                        </p>
                                    ) : (
                                        templateMembers.map(m => (
                                            <div key={m.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{m.name}</h4>
                                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {isPoetry ? `Autor: ${m.phone || 'Anónimo'}` : `Identificación: ${m.number || 'Sin número'}`}
                                                        </p>
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                                                        {new Date(m.created_at || m.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {!isPoetry && m.identifications?.familyName && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                                                        <span style={{ color: 'var(--primary)' }}>👨‍👩‍👧‍👦 Familia: {m.identifications.familyName}</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>· {m.identifications.familyRole || 'Miembro'}</span>
                                                    </div>
                                                )}
                                                {isPoetry && m.identifications?.isDigitized && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <span style={{ background: 'rgba(253, 224, 71, 0.15)', color: '#fde047', border: '1px solid rgba(253, 224, 71, 0.2)', padding: '0.05rem 0.3rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                                                            ✨ Digitalizado por IA
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Service Logs */}
                            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={18} color="var(--secondary)" /> Historial de Asignación de Servicios ({templateServices.length})
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {templateServices.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                                            No se han registrado servicios en esta plantilla.
                                        </p>
                                    ) : (
                                        templateServices.map(s => (
                                            <div key={s.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.member_name || s.memberName}</h4>
                                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 500 }}>
                                                            {s.service_type || s.serviceType}
                                                        </p>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                        📅 {s.service_date || s.serviceDate}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Scroll size={48} style={{ opacity: 0.2, marginBottom: '1rem', display: 'block', margin: '0 auto' }} />
                    <p>No tienes plantillas creadas. Crea una plantilla primero para ver su historia.</p>
                </div>
            )}
        </div>
    );
};

export default HistoryView;
