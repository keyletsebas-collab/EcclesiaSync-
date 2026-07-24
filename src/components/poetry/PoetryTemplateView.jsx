import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateTemplatePDF } from '../../utils/pdfGenerator';
import { Trash2, Edit2, UserPlus, Download, Search, ShieldAlert, Save, BookOpen, Sparkles, Upload, Loader2, X } from 'lucide-react';
import Modal from '../Modal';
import PoetryServicesView from './PoetryServicesView';
import ProgramsView from '../shared/ProgramsView';
import FinancesView from '../shared/FinancesView';
import notificationService from '../../utils/NotificationService';
import { digitalizePoetry } from '../../utils/GeminiService';

const PoetryTemplateView = ({ templateId, onDeleted }) => {
    const { templates, members, addMember, deleteMember, updateTemplate, deleteTemplate, updateMember } = useStorage();
    const { currentUser, canEdit } = useAuth();
    const { t } = useLanguage();

    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('members'); // 'members', 'services', 'programs', 'finances', 'settings'

    // Poetry specific states
    const [expandedPoemId, setExpandedPoemId] = useState(null);
    const [poemFilter, setPoemFilter] = useState('all');
    const [isDigitalizing, setIsDigitalizing] = useState(false);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [editingPoemId, setEditingPoemId] = useState(null);
    const [editPoemData, setEditPoemData] = useState({ title: '', content: '' });

    // New Poem Form
    const [newPoemTitle, setNewPoemTitle] = useState('');
    const [newPoemAuthor, setNewPoemAuthor] = useState('');
    const [newPoemContent, setNewPoemContent] = useState('');

    // Template Settings
    const [editTemplateName, setEditTemplateName] = useState('');
    const [editTemplatePassword, setEditTemplatePassword] = useState('');
    const [editRehearsalSchedules, setEditRehearsalSchedules] = useState([]);

    const template = templates.find(t => t.id === templateId);
    const templateMembers = members.filter(m => m.templateId === templateId);

    const activeMembership = currentUser?.memberships?.find(m => m.id === template?.accountId);

    React.useEffect(() => {
        if (template) {
            setEditTemplateName(template.name || '');
            const pwdField = template.customFields?.find(f => f.startsWith('__password:'));
            setEditTemplatePassword(pwdField ? pwdField.replace('__password:', '') : '');
            const schedulesField = template.customFields?.find(f => f.startsWith('__rehearsalSchedules:'));
            if (schedulesField) {
                try {
                    setEditRehearsalSchedules(JSON.parse(schedulesField.replace('__rehearsalSchedules:', '')));
                } catch (e) {
                    setEditRehearsalSchedules([]);
                }
            } else {
                setEditRehearsalSchedules([]);
            }
        }
    }, [templateId, templates]);

    if (!template) return null;

    // Split poem entries vs recite participants
    const poems = templateMembers.filter(m => !m.identifications?.isParticipant);
    const participants = templateMembers.filter(m => m.identifications?.isParticipant);

    const filteredPoems = poems.filter(poem => {
        const titleMatch = poem.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const authorMatch = poem.phone?.toLowerCase().includes(searchTerm.toLowerCase());
        const contentMatch = poem.identifications?.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = titleMatch || authorMatch || contentMatch;

        if (!matchesSearch) return false;
        if (poemFilter === 'digitized') return !!poem.identifications?.isDigitized;
        if (poemFilter === 'manual') return !poem.identifications?.isDigitized;
        return true;
    });

    const handleAddPoem = async (e) => {
        e.preventDefault();
        if (!newPoemTitle.trim() || !newPoemContent.trim()) return;

        await addMember(templateId, {
            name: newPoemTitle.trim(),
            phone: newPoemAuthor.trim() || 'Anónimo',
            identifications: {
                isParticipant: false,
                content: newPoemContent.trim(),
                isDigitized: false
            }
        });

        try {
            await notificationService.notifyPoetryAdded(newPoemTitle.trim(), newPoemAuthor.trim());
        } catch (err) {
            console.error('Error sending poem notification:', err);
        }

        setNewPoemTitle('');
        setNewPoemAuthor('');
        setNewPoemContent('');
        setIsAddMemberOpen(false);
    };

    const handleScanImage = async (file) => {
        if (!file) return;
        setIsDigitalizing(true);
        try {
            let resultText = '';
            try {
                resultText = await digitalizePoetry(file);
            } catch (geminiErr) {
                if (geminiErr.message?.includes('clave API') || geminiErr.message?.includes('API_KEY') || geminiErr.message?.includes('configurado')) {
                    const userKey = prompt('🔑 Digitalización IA (Google Gemini):\nIngresa tu clave API de Gemini (o pégala aquí). Se guardará en este dispositivo:');
                    if (userKey && userKey.trim()) {
                        localStorage.setItem('VITE_GEMINI_API_KEY', userKey.trim());
                        resultText = await digitalizePoetry(file);
                    } else {
                        throw geminiErr;
                    }
                } else {
                    // Fallback to backend API endpoint if configured
                    const formData = new FormData();
                    formData.append('image', file);

                    const res = await fetch('/api/scan-poetry', {
                        method: 'POST',
                        body: formData
                    });

                    const contentType = res.headers.get('content-type') || '';
                    if (!res.ok || !contentType.includes('application/json')) {
                        throw new Error(geminiErr.message || 'Servidor de IA no disponible o la clave API no está configurada.');
                    }

                    const data = await res.json();
                    if (data.title && data.content) {
                        setNewPoemTitle(data.title);
                        setNewPoemContent(data.content);
                        if (data.author) setNewPoemAuthor(data.author);
                        setIsAddMemberOpen(true);
                        return;
                    }
                }
            }

            if (resultText) {
                const lines = resultText.split('\n').map(l => l.trim()).filter(Boolean);
                const title = lines[0] || file.name.replace(/\.[^/.]+$/, '');
                const content = lines.slice(1).join('\n') || resultText;

                setNewPoemTitle(title);
                setNewPoemContent(content);
                setIsAddMemberOpen(true);
            }
        } catch (err) {
            alert(`Fallo en digitalización IA: ${err.message}`);
        } finally {
            setIsDigitalizing(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <header className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{template.name}</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            📖 Biblioteca de Poesías ({poems.length} poemas registrados)
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button 
                        className="btn" 
                        onClick={() => generateTemplatePDF(template, templateMembers, [])}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={16} /> PDF
                    </button>
                    {canEdit && (
                        <button 
                            className="btn btn-primary" 
                            onClick={() => setIsAddMemberOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <UserPlus size={16} /> Añadir Poesía
                        </button>
                    )}
                </div>
            </header>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
                <button
                    onClick={() => setActiveTab('members')}
                    style={{
                        background: activeTab === 'members' ? 'var(--primary-glow)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'members' ? '#fff' : 'var(--text-muted)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                    }}
                >
                    📖 Biblioteca de Poemas ({poems.length})
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    style={{
                        background: activeTab === 'services' ? 'var(--primary-glow)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'services' ? '#fff' : 'var(--text-muted)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                    }}
                >
                    📅 Agenda y Ensayos
                </button>
                <button
                    onClick={() => setActiveTab('programs')}
                    style={{
                        background: activeTab === 'programs' ? 'var(--primary-glow)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'programs' ? '#fff' : 'var(--text-muted)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                    }}
                >
                    📋 Programas
                </button>
                <button
                    onClick={() => setActiveTab('finances')}
                    style={{
                        background: activeTab === 'finances' ? 'var(--primary-glow)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'finances' ? '#fff' : 'var(--text-muted)',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                    }}
                >
                    💵 Finanzas
                </button>
                {(currentUser?.isMaster || activeMembership?.role === 'master') && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        style={{
                            background: activeTab === 'settings' ? 'var(--primary-glow)' : 'transparent',
                            border: 'none',
                            color: activeTab === 'settings' ? '#fff' : 'var(--text-muted)',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        🔧 Configuraciones
                    </button>
                )}
            </div>

            {/* TAB: Members / Poems Library */}
            {activeTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Search & AI Scanner Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', flex: 1, gap: '0.5rem' }}>
                                <Search size={18} color="var(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Buscar poema por título, autor o contenido..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none' }}
                                />
                            </div>
                        </div>

                        {canEdit && (
                            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isDigitalizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                Digitalizar Poema con IA
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => e.target.files?.[0] && handleScanImage(e.target.files[0])}
                                    disabled={isDigitalizing}
                                />
                            </label>
                        )}
                    </div>

                    {/* Poems List Grid */}
                    {filteredPoems.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron poesías registradas.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                            {filteredPoems.map(poem => {
                                const isExpanded = expandedPoemId === poem.id;
                                const isEditing = editingPoemId === poem.id;

                                return (
                                    <div key={poem.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Georgia, serif', color: 'var(--text-main)' }}>
                                                    {poem.name}
                                                </h3>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    ✍️ Autor: {poem.phone || 'Anónimo'}
                                                </span>
                                            </div>
                                            {canEdit && (
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingPoemId(poem.id);
                                                            setEditPoemData({ title: poem.name, content: poem.identifications?.content || '' });
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('¿Seguro que deseas eliminar este poema?')) {
                                                                deleteMember(poem.id);
                                                            }
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <input
                                                    className="glass-input"
                                                    value={editPoemData.title}
                                                    onChange={(e) => setEditPoemData({ ...editPoemData, title: e.target.value })}
                                                    placeholder="Título del poema"
                                                />
                                                <textarea
                                                    className="glass-input"
                                                    rows={8}
                                                    value={editPoemData.content}
                                                    onChange={(e) => setEditPoemData({ ...editPoemData, content: e.target.value })}
                                                    placeholder="Texto del poema..."
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn" onClick={() => setEditingPoemId(null)}>Cancelar</button>
                                                    <button 
                                                        className="btn btn-primary"
                                                        onClick={async () => {
                                                            await updateMember(poem.id, {
                                                                name: editPoemData.title,
                                                                identifications: {
                                                                    ...(poem.identifications || {}),
                                                                    content: editPoemData.content
                                                                }
                                                            });
                                                            setEditingPoemId(null);
                                                        }}
                                                    >
                                                        Guardar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{
                                                fontFamily: 'Georgia, serif',
                                                fontSize: '0.95rem',
                                                lineHeight: '1.7',
                                                color: 'var(--text-main)',
                                                whiteSpace: 'pre-wrap',
                                                background: 'rgba(0,0,0,0.15)',
                                                padding: '1rem',
                                                borderRadius: '10px',
                                                maxHeight: isExpanded ? 'none' : '150px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}>
                                                {poem.identifications?.content || 'Sin contenido de texto.'}
                                            </div>
                                        )}

                                        {!isEditing && (
                                            <button
                                                onClick={() => setExpandedPoemId(isExpanded ? null : poem.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, alignSelf: 'flex-start' }}
                                            >
                                                {isExpanded ? 'Ver menos ↑' : 'Leer poema completo ↓'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Outings & Services */}
            {activeTab === 'services' && (
                <PoetryServicesView template={template} templateId={templateId} members={templateMembers} />
            )}

            {/* TAB: Programs */}
            {activeTab === 'programs' && (
                <ProgramsView templateId={templateId} accountId={template.accountId} isTemplateEditor={canEdit} />
            )}

            {/* TAB: Finances */}
            {activeTab === 'finances' && (
                <FinancesView templateId={templateId} accountId={template.accountId} isTemplateAdmin={currentUser?.isMaster || activeMembership?.role === 'master'} />
            )}

            {/* TAB: Settings */}
            {activeTab === 'settings' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px', width: '100%', margin: '0 auto' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🔧 Configuraciones de la Plantilla
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Nombre de la Plantilla
                            </label>
                            <input
                                className="glass-input"
                                value={editTemplateName}
                                onChange={(e) => setEditTemplateName(e.target.value)}
                                disabled={!canEdit}
                                placeholder="Nombre de la plantilla"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Contraseña de Acceso
                            </label>
                            <input
                                type="text"
                                className="glass-input"
                                value={editTemplatePassword}
                                onChange={(e) => setEditTemplatePassword(e.target.value)}
                                disabled={!canEdit}
                                placeholder="Sin contraseña (pública)"
                                style={{ width: '100%' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                                {canEdit 
                                  ? 'Define una contraseña para restringir el acceso a esta plantilla a usuarios no registrados.'
                                  : 'Contraseña requerida para ingresar a esta plantilla (solo lectura para ti).'
                                }
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Horarios de Ensayo</span>
                                {canEdit && (
                                    <button 
                                        type="button" 
                                        className="btn" 
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                                        onClick={() => setEditRehearsalSchedules([...editRehearsalSchedules, { days: '', time: '', modality: 'Presencial' }])}
                                    >
                                        <UserPlus size={12} /> Añadir Horario
                                    </button>
                                )}
                            </h4>
                            
                            {editRehearsalSchedules.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                    No hay horarios configurados.
                                </div>
                            ) : (
                                editRehearsalSchedules.map((schedule, index) => (
                                    <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(130px, 1fr) auto auto', gap: '0.75rem', alignItems: 'end', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Días</label>
                                            <input
                                                className="glass-input"
                                                value={schedule.days}
                                                onChange={(e) => {
                                                    const newSchedules = [...editRehearsalSchedules];
                                                    newSchedules[index].days = e.target.value;
                                                    setEditRehearsalSchedules(newSchedules);
                                                }}
                                                disabled={!canEdit}
                                                placeholder="Ej: Lunes"
                                                style={{ width: '100%', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Hora</label>
                                            <input
                                                type="time"
                                                className="glass-input"
                                                value={schedule.time}
                                                onChange={(e) => {
                                                    const newSchedules = [...editRehearsalSchedules];
                                                    newSchedules[index].time = e.target.value;
                                                    setEditRehearsalSchedules(newSchedules);
                                                }}
                                                disabled={!canEdit}
                                                style={{ width: '100%', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                disabled={!canEdit}
                                                onClick={() => {
                                                    const newSchedules = [...editRehearsalSchedules];
                                                    newSchedules[index].modality = schedule.modality === 'Presencial' ? 'Virtual' : 'Presencial';
                                                    setEditRehearsalSchedules(newSchedules);
                                                }}
                                                style={{
                                                    padding: '0.4rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    border: '1px solid ' + (schedule.modality === 'Virtual' ? '#3b82f6' : '#10b981'),
                                                    background: schedule.modality === 'Virtual' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: schedule.modality === 'Virtual' ? '#60a5fa' : '#34d399',
                                                    cursor: canEdit ? 'pointer' : 'default',
                                                    minWidth: '80px'
                                                }}
                                            >
                                                {schedule.modality || 'Presencial'}
                                            </button>
                                        </div>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                style={{ padding: '0.4rem' }}
                                                onClick={() => {
                                                    const newSchedules = editRehearsalSchedules.filter((_, i) => i !== index);
                                                    setEditRehearsalSchedules(newSchedules);
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {canEdit && (
                            <button
                                onClick={async () => {
                                    if (!editTemplateName.trim()) return;
                                    let updatedCustomFields = (template.customFields || []).filter(f => !f.startsWith('__password:') && !f.startsWith('__rehearsalDays:') && !f.startsWith('__rehearsalTime:') && !f.startsWith('__rehearsalSchedules:'));
                                    if (editTemplatePassword.trim()) {
                                        updatedCustomFields.push(`__password:${editTemplatePassword.trim()}`);
                                    }
                                    if (editRehearsalSchedules.length > 0) {
                                        const validSchedules = editRehearsalSchedules.filter(s => s.days.trim() || s.time.trim());
                                        if (validSchedules.length > 0) {
                                            updatedCustomFields.push(`__rehearsalSchedules:${JSON.stringify(validSchedules)}`);
                                            const schedDesc = validSchedules.map(s => `${s.days} a las ${s.time} (${s.modality})`).join(', ');
                                            notificationService.notifyRehearsalOrOutingCreated(
                                                `Horario de Ensayos Actualizado (${template?.name || ''})`,
                                                `Días de ensayo: ${schedDesc}`
                                            );
                                        }
                                    }
                                    try {
                                        await updateTemplate(templateId, { name: editTemplateName, customFields: updatedCustomFields });
                                        alert('Configuración guardada correctamente.');
                                    } catch (err) {
                                        alert(`Error al guardar cambios: ${err.message}`);
                                    }
                                }}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                            >
                                <Save size={16} /> Guardar Cambios
                            </button>
                        )}

                        {canEdit && (
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#f87171' }}>Zona de Peligro</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    Al eliminar esta plantilla, se borrarán todos sus miembros, servicios, poemas e historial de forma permanente.
                                </p>
                                <button
                                    className="btn btn-danger"
                                    onClick={async () => {
                                        if (window.confirm(t('deleteTemplateConfirm') || '¿Seguro que deseas eliminar esta plantilla?')) {
                                            await deleteTemplate(template.id);
                                            if (onDeleted) onDeleted();
                                        }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                                >
                                    <Trash2 size={16} /> Eliminar Plantilla
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Poem Modal */}
            <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Añadir Nueva Poesía">
                <form onSubmit={handleAddPoem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Título de la Poesía</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newPoemTitle}
                            onChange={(e) => setNewPoemTitle(e.target.value)}
                            required
                            placeholder="Ej: El Buen Pastor"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Autor / Recitador</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newPoemAuthor}
                            onChange={(e) => setNewPoemAuthor(e.target.value)}
                            placeholder="Nombre del autor o recitador"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Texto / Contenido del Poema</label>
                        <textarea
                            className="glass-input"
                            rows={8}
                            value={newPoemContent}
                            onChange={(e) => setNewPoemContent(e.target.value)}
                            required
                            placeholder="Escribe la poesía aquí..."
                            style={{ width: '100%', fontFamily: 'Georgia, serif' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                        Guardar Poesía
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default PoetryTemplateView;
