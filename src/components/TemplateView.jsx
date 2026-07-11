import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateTemplatePDF } from '../utils/pdfGenerator';
import { Trash2, Edit2, UserPlus, UserMinus, Download, Search, ShieldAlert, Crown, Calendar, Save, Copy, Check, BookOpen, Sparkles, Upload, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from './Modal';
import ServicesView from './ServicesView';

const TemplateView = ({ templateId, onDeleted }) => {
    const { templates, members, addMember, deleteMember, updateTemplate, deleteTemplate, updateMember } = useStorage();
    const { currentUser, canEdit } = useAuth();
    const { t } = useLanguage();

    const template = templates.find(t => t.id === templateId);
    const templateMembers = members.filter(m => m.templateId === templateId);

    const activeMembership = currentUser?.memberships?.find(m => m.id === template?.accountId);
    const currentUserFullName = activeMembership?.fullName || currentUser?.username || '';

    const isPoetry = template?.customFields?.includes('__poetry__');
    const isSonido = template?.customFields?.includes('__sonido__');
    const isAlreadyMember = templateMembers.some(m => m.name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim());

    if (!template) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Plantilla no encontrada.
            </div>
        );
    }

    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Poetry states
    const [expandedPoemId, setExpandedPoemId] = useState(null);
    const [poemFilter, setPoemFilter] = useState('all');
    const [isDigitalizing, setIsDigitalizing] = useState(false);
    const [aiResult, setAiResult] = useState('');
    const [aiTitle, setAiTitle] = useState('');
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [editingPoemId, setEditingPoemId] = useState(null);
    const [editPoemData, setEditPoemData] = useState({ title: '', content: '' });

    // Forms
    const [newPoemTitle, setNewPoemTitle] = useState('');
    const [newPoemAuthor, setNewPoemAuthor] = useState('');
    const [newPoemContent, setNewPoemContent] = useState('');
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [editTemplateName, setEditTemplateName] = useState('');
    const [activeTab, setActiveTab] = useState('members'); // 'members' or 'services'
    const [copiedId, setCopiedId] = useState(null);

    // Family System State
    const [activeFamilyKey, setActiveFamilyKey] = useState(null);
    const [linkMemberId, setLinkMemberId] = useState('');
    const [linkRole, setLinkRole] = useState('Hijo/a');
    const [newFamilyName, setNewFamilyName] = useState('');
    const [newFamilyRole, setNewFamilyRole] = useState('Jefe de familia');
    const [newFamilyMemberId, setNewFamilyMemberId] = useState('');

    const handleSetFamily = async (memberId, familyName, familyRole) => {
        const member = members.find(m => m.id === memberId);
        if (member) {
            const updatedIdentifications = {
                ...(member.identifications || {}),
                familyName: familyName ? familyName.trim() : '',
                familyRole: familyRole || ''
            };
            await updateMember(memberId, { identifications: updatedIdentifications });
        }
    };

    const getFamilyGroups = () => {
        const groups = {};
        templateMembers.forEach(m => {
            const familyName = m.identifications?.familyName?.trim();
            if (familyName) {
                const key = familyName.toLowerCase();
                if (!groups[key]) {
                    groups[key] = {
                        name: familyName,
                        members: []
                    };
                }
                groups[key].members.push(m);
            }
        });
        return Object.values(groups);
    };

    const membersWithoutFamily = templateMembers.filter(m => !m.identifications?.familyName?.trim());

    // Member Form State
    const [newMember, setNewMember] = useState({
        name: '',
        number: '',
        phone: '',
        isLeader: false,
        identifications: {}
    });

    if (!template) return null;

    const handleAddMember = async (e) => {
        e.preventDefault();
        await addMember(templateId, newMember);
        setIsAddMemberOpen(false);
        setNewMember({ name: '', number: '', phone: '', isLeader: false, identifications: {} });
    };

    const handleUpdateTemplateName = async (e) => {
        e.preventDefault();
        if (editTemplateName.trim()) {
            await updateTemplate(templateId, { name: editTemplateName });
            setIsEditingTemplate(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredMembers = templateMembers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        String(m.number).includes(searchTerm)
    );

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                background: 'rgba(15, 23, 42, 0.3)',
                padding: '1.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
            }}>
                <div>
                    {isEditingTemplate ? (
                        <form onSubmit={handleUpdateTemplateName} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                className="glass-input"
                                value={editTemplateName}
                                onChange={(e) => setEditTemplateName(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn btn-primary"><Save size={16} /></button>
                            <button type="button" onClick={() => setIsEditingTemplate(false)} className="btn">Cancel</button>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h1 style={{ margin: 0, fontSize: '2rem' }}>{template.name}</h1>
                            {canEdit && (
                                <button
                                    onClick={() => { setEditTemplateName(template.name); setIsEditingTemplate(true); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                    )}
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {templateMembers.length} {t('members')}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn"
                        style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary-glow)' }}
                        onClick={() => generateTemplatePDF(template, templateMembers)}
                    >
                        <Download size={18} /> {t('exportPDF')}
                    </button>
                    {canEdit && isPoetry && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsAddMemberOpen(true)}
                        >
                            <UserPlus size={18} /> {t('addMember')}
                        </button>
                    )}
                    {canEdit ? (
                        <button
                            className="btn btn-danger"
                            onClick={async () => {
                                if (window.confirm(t('deleteTemplateConfirm'))) {
                                    await deleteTemplate(template.id);
                                    if (onDeleted) onDeleted();
                                }
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <ShieldAlert size={14} /> {t('readOnly') || 'Vista de solo lectura'}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {isAlreadyMember ? (
                currentUser?.username?.toLowerCase() === 'keylet' ? (
                    <>
                        {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '2rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.5rem'
            }}>
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
                        transition: 'all 0.2s'
                    }}
                >
                    {isPoetry ? '📖 Biblioteca de Poemas' : t('members')}
                </button>
                {!isPoetry && !isSonido && (
                    <button
                        onClick={() => setActiveTab('families')}
                        style={{
                            background: activeTab === 'families' ? 'var(--primary-glow)' : 'transparent',
                            border: 'none',
                            color: activeTab === 'families' ? '#fff' : 'var(--text-muted)',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        👨‍👩‍👧‍👦 Familias
                    </button>
                )}
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
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Calendar size={16} />
                    {isPoetry ? '📅 Agenda y Ensayos' : t('services')}
                </button>
                {isPoetry && (
                    <button
                        onClick={() => setActiveTab('participants')}
                        style={{
                            background: activeTab === 'participants' ? 'var(--primary-glow)' : 'transparent',
                            border: 'none',
                            color: activeTab === 'participants' ? '#fff' : 'var(--text-muted)',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        👥 Usuarios
                    </button>
                )}
            </div>

            {activeTab === 'members' ? (
                isPoetry ? (
                    <div className="poetry-library-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* AI Digitalizer Panel */}
                        {showAiPanel && (
                            <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem' }}>
                                        <Sparkles size={18} color="var(--primary)" /> Digitalización con IA (OCR)
                                    </h3>
                                    <button className="btn" style={{ padding: '0.35rem', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setShowAiPanel(false)}><X size={16} /></button>
                                </div>
                                {isDigitalizing ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1.2s linear infinite', marginBottom: '0.75rem', marginLeft: 'auto', marginRight: 'auto' }} />
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>La Inteligencia Artificial está leyendo y dando formato a tus versos...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Título Sugerido</label>
                                            <input className="glass-input" value={aiTitle} onChange={e => setAiTitle(e.target.value)} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Texto Extraído y Formateado</label>
                                            <textarea className="glass-input" value={aiResult} onChange={e => setAiResult(e.target.value)} rows={8} style={{ fontFamily: 'Georgia, serif', lineHeight: '1.6' }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button className="btn" onClick={() => { setShowAiPanel(false); setAiResult(''); setAiTitle(''); }}>Descartar</button>
                                            <button className="btn btn-primary" onClick={async () => {
                                                if (!aiTitle.trim() || !aiResult.trim()) return;
                                                await addMember(templateId, {
                                                    name: aiTitle.trim(),
                                                    phone: currentUser?.username || 'Anónimo',
                                                    number: '',
                                                    isLeader: false,
                                                    identifications: {
                                                        content: aiResult,
                                                        isDigitized: true
                                                    }
                                                });
                                                setShowAiPanel(false);
                                                setAiResult('');
                                                setAiTitle('');
                                            }}>Guardar en la Biblioteca</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Search and Filters */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    className="glass-input"
                                    placeholder="Buscar por título, autor o contenido..."
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-glass)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                {[['all', 'Todas'], ['digitized', '✨ IA'], ['manual', '✍️ Manual']].map(([val, label]) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setPoemFilter(val)}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.8rem',
                                            border: 'none',
                                            background: poemFilter === val ? 'var(--primary)' : 'transparent',
                                            color: poemFilter === val ? '#fff' : 'var(--text-muted)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 500
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Poem List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(() => {
                                const filteredPoems = templateMembers.filter(p => {
                                    if (p.identifications?.isParticipant) return false;
                                    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        p.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        p.identifications?.content?.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchType = poemFilter === 'all' ||
                                        (poemFilter === 'digitized' && p.identifications?.isDigitized) ||
                                        (poemFilter === 'manual' && !p.identifications?.isDigitized);
                                    return matchSearch && matchType;
                                });

                                if (filteredPoems.length === 0) {
                                    return (
                                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '1rem', display: 'block', margin: '0 auto' }} />
                                            No se encontraron poesías.
                                        </div>
                                    );
                                }

                                return filteredPoems.map(poem => {
                                    const isExpanded = expandedPoemId === poem.id;
                                    const isEditing = editingPoemId === poem.id;

                                    return (
                                        <div key={poem.id} className="glass-panel" style={{
                                            borderLeft: isExpanded ? '3px solid var(--primary)' : '3px solid transparent',
                                            transition: 'all 0.2s',
                                            overflow: 'hidden'
                                        }}>
                                            {/* Header summary */}
                                            <div
                                                onClick={() => !isEditing && setExpandedPoemId(isExpanded ? null : poem.id)}
                                                style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {isEditing ? (
                                                        <input
                                                            className="glass-input"
                                                            value={editPoemData.title}
                                                            onChange={e => setEditPoemData(prev => ({ ...prev, title: e.target.value }))}
                                                            onClick={e => e.stopPropagation()}
                                                            style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, padding: '0.4rem' }}
                                                        />
                                                    ) : (
                                                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'Georgia, serif', color: 'var(--text-main)' }}>{poem.name}</h3>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {poem.identifications?.isDigitized && (
                                                            <span style={{ background: 'rgba(253, 224, 71, 0.15)', border: '1px solid rgba(253, 224, 71, 0.3)', color: '#fde047', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                                                                ✨ IA
                                                            </span>
                                                        )}
                                                        <span>Autor: <strong style={{ color: 'var(--text-main)' }}>{poem.phone || 'Anónimo'}</strong></span>
                                                        <span>· {poem.identifications?.content?.split(/\s+/).filter(Boolean).length || 0} palabras</span>
                                                        <span>· {new Date(poem.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                                    {isEditing ? (
                                                        <>
                                                            <button className="btn" style={{ padding: '0.35rem 0.6rem', color: 'var(--primary)' }} onClick={async () => {
                                                                await updateMember(poem.id, {
                                                                    name: editPoemData.title,
                                                                    identifications: {
                                                                        ...(poem.identifications || {}),
                                                                        content: editPoemData.content
                                                                    }
                                                                });
                                                                setEditingPoemId(null);
                                                            }}><Check size={14} /></button>
                                                            <button className="btn" style={{ padding: '0.35rem 0.6rem' }} onClick={() => setEditingPoemId(null)}><X size={14} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {canEdit && (
                                                                <>
                                                                    <button className="btn" style={{ padding: '0.35rem 0.6rem' }} onClick={() => {
                                                                        setEditingPoemId(poem.id);
                                                                        setEditPoemData({ title: poem.name, content: poem.identifications?.content || '' });
                                                                        setExpandedPoemId(poem.id);
                                                                    }}><Edit2 size={13} /></button>
                                                                    <button className="btn btn-danger" style={{ padding: '0.35rem 0.6rem' }} onClick={async () => {
                                                                        if (window.confirm('¿Eliminar este poema de la biblioteca?')) {
                                                                            await deleteMember(poem.id);
                                                                        }
                                                                    }}><Trash2 size={13} /></button>
                                                                </>
                                                            )}
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded content */}
                                            {isExpanded && (
                                                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                                                    {isEditing ? (
                                                        <textarea
                                                            className="glass-input"
                                                            value={editPoemData.content}
                                                            onChange={e => setEditPoemData(prev => ({ ...prev, content: e.target.value }))}
                                                            rows={12}
                                                            style={{ width: '100%', fontFamily: 'Georgia, serif', lineHeight: '1.6', fontSize: '1rem' }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            whiteSpace: 'pre-wrap',
                                                            lineHeight: '1.8',
                                                            fontSize: '1.1rem',
                                                            fontFamily: 'Georgia, serif',
                                                            color: 'var(--text-main)',
                                                            maxWidth: '65ch',
                                                            margin: '0.5rem 0',
                                                            letterSpacing: '0.01em'
                                                        }}>
                                                            {poem.identifications?.content || 'Sin contenido.'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Search */}
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            className="glass-input"
                            placeholder={t('searchPlaceholder')}
                            style={{ paddingLeft: '3rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Members Table */}
                    <div className="glass-panel" style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('name')}</th>
                                    <th>{t('idNumber')}</th>
                                    <th>{t('phone')}</th>
                                    {!isSonido && <th>Familia</th>}
                                    {template.customFields.map(field => (
                                        <th key={field}>{field}</th>
                                    ))}
                                    <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={(isSonido ? 4 : 5) + template.customFields.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            {t('noMembersFound')}
                                        </td>
                                    </tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id}>
                                        <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {member.name}
                                                {member.isLeader && (
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                                        color: '#000',
                                                        fontSize: '0.65rem',
                                                        padding: '0.15rem 0.4rem',
                                                        borderRadius: '4px',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}>
                                                        <Crown size={10} />
                                                        {t('leaderBadge')}
                                                    </span>
                                                )}
                                                {(() => {
                                                    const isSelf = member.name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim();
                                                    return (
                                                        <button
                                                            onClick={async () => {
                                                                if (!isSelf) return;
                                                                await updateMember(member.id, {
                                                                    identifications: {
                                                                        ...(member.identifications || {}),
                                                                        hasKey: !member.identifications?.hasKey
                                                                    }
                                                                });
                                                            }}
                                                            style={{
                                                                background: member.identifications?.hasKey ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                border: '1px solid ' + (member.identifications?.hasKey ? 'rgba(251, 191, 36, 0.4)' : 'var(--border)'),
                                                                color: member.identifications?.hasKey ? '#fbbf24' : 'var(--text-muted)',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '6px',
                                                                fontSize: '0.7rem',
                                                                cursor: isSelf ? 'pointer' : 'not-allowed',
                                                                opacity: isSelf ? 1 : 0.65,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            title={isSelf 
                                                                ? (member.identifications?.hasKey ? "Entregar la llave" : "Marcar que tengo la llave")
                                                                : "Solo esta persona puede cambiar el estado de su llave"}
                                                        >
                                                            🔑 {isSelf ? 'Tengo la llave' : (member.identifications?.hasKey ? 'Tiene la llave' : 'Tiene la llave')}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td>
                                            <div 
                                                onClick={() => member.number && copyToClipboard(String(member.number))}
                                                title={t('clickToCopy') || 'Click para copiar'}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    cursor: member.number ? 'pointer' : 'default',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--primary)',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.05em',
                                                    padding: '0.2rem 0.4rem',
                                                    borderRadius: '4px',
                                                    background: copiedId === String(member.number) ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {member.number || '-'}
                                                {member.number && (
                                                    copiedId === String(member.number) ? <Check size={12} color="var(--primary)" /> : <Copy size={12} style={{ opacity: 0.5 }} />
                                                )}
                                            </div>
                                        </td>
                                        <td>{member.phone}</td>
                                        {!isSonido && (
                                            <td>
                                                {member.identifications?.familyName ? (
                                                    <span style={{
                                                        background: 'rgba(99, 102, 241, 0.12)',
                                                        border: '1px solid var(--border)',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        color: '#a5b4fc',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem'
                                                    }}>
                                                        👨‍👩‍👧‍👦 {member.identifications.familyName} 
                                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                                            ({member.identifications.familyRole || 'Familiar'})
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Sin familia</span>
                                                )}
                                            </td>
                                        )}
                                        {template.customFields.map(field => (
                                            <td key={field}>{member.identifications[field] || '-'}</td>
                                        ))}
                                        <td style={{ textAlign: 'right' }}>
                                            {canEdit ? (
                                                <button
                                                    className="btn-danger"
                                                    style={{ padding: '0.4rem', borderRadius: '6px' }}
                                                    onClick={async () => await deleteMember(member.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    <ShieldAlert size={14} style={{ opacity: 0.5 }} />
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )
            ) : activeTab === 'families' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Crear nueva familia */}
                    {canEdit && (
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ➕ Crear un nuevo Grupo Familiar
                            </h3>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Apellido o Nombre de Familia</label>
                                    <input 
                                        className="glass-input" 
                                        placeholder="Ej: Pérez Gómez"
                                        value={newFamilyName}
                                        onChange={e => setNewFamilyName(e.target.value)}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Seleccionar Miembro Principal</label>
                                    <select 
                                        className="glass-input"
                                        value={newFamilyMemberId}
                                        onChange={e => setNewFamilyMemberId(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">-- Seleccionar miembro sin familia --</option>
                                        {membersWithoutFamily.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} {m.number ? `(ID: ${m.number})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1, minWidth: '220px' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Rol del Miembro</label>
                                    <select 
                                        className="glass-input"
                                        value={newFamilyRole}
                                        onChange={e => setNewFamilyRole(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="Jefe de familia">👑 Jefe de familia</option>
                                        <option value="Cónyuge">Cónyuge</option>
                                        <option value="Hijo/a">Hijo/a</option>
                                        <option value="Pariente">Pariente</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <button 
                                    className="btn btn-primary"
                                    onClick={async () => {
                                        if (!newFamilyName.trim() || !newFamilyMemberId) {
                                            alert('Por favor especifica el nombre de familia y selecciona un miembro.');
                                            return;
                                        }
                                        await handleSetFamily(newFamilyMemberId, newFamilyName, newFamilyRole);
                                        setNewFamilyName('');
                                        setNewFamilyMemberId('');
                                        setNewFamilyRole('Jefe de familia');
                                    }}
                                >
                                    Crear Familia
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grilla de Familias */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {getFamilyGroups().map(fam => (
                            <div key={fam.name.toLowerCase()} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <span>👨‍👩‍👧‍👦 Familia {fam.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                            {fam.members.length} {fam.members.length === 1 ? 'miembro' : 'miembros'}
                                        </span>
                                    </h3>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                    {fam.members.map(m => {
                                        const isHead = m.identifications?.familyRole === 'Jefe de familia';
                                        return (
                                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.9rem' }}>{m.name}</span>
                                                    {m.number && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px', marginLeft: '0.25rem' }}>
                                                            #{m.number}
                                                        </span>
                                                    )}
                                                    {isHead && <Crown size={12} color="#fbbf24" title="Jefe de familia" />}
                                                    {m.identifications?.needsPrayer && (
                                                        <span className="prayer-pulsing-badge" style={{
                                                            fontSize: '0.65rem',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#fca5a5',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            padding: '0.1rem 0.35rem',
                                                            borderRadius: '4px',
                                                            fontWeight: 600,
                                                            marginLeft: '0.5rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.15rem'
                                                        }}>
                                                            🙏 Orar por mí
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {(() => {
                                                        const isSelf = m.name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim();
                                                        return (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!isSelf) return;
                                                                    await updateMember(m.id, {
                                                                        identifications: {
                                                                            ...(m.identifications || {}),
                                                                            hasKey: !m.identifications?.hasKey
                                                                        }
                                                                    });
                                                                }}
                                                                style={{
                                                                    background: m.identifications?.hasKey ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid ' + (m.identifications?.hasKey ? 'rgba(251, 191, 36, 0.4)' : 'var(--border)'),
                                                                    color: m.identifications?.hasKey ? '#fbbf24' : 'var(--text-muted)',
                                                                    padding: '0.2rem 0.5rem',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.7rem',
                                                                    cursor: isSelf ? 'pointer' : 'not-allowed',
                                                                    opacity: isSelf ? 1 : 0.65,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    transition: 'all 0.2s',
                                                                    marginRight: '0.25rem'
                                                                }}
                                                                title={isSelf 
                                                                    ? (m.identifications?.hasKey ? "Entregar la llave" : "Marcar que tengo la llave")
                                                                    : "Solo esta persona puede cambiar el estado de su llave"}
                                                            >
                                                                🔑 {isSelf ? 'Tengo la llave' : (m.identifications?.hasKey ? 'Tiene la llave' : 'Tiene la llave')}
                                                            </button>
                                                        );
                                                    })()}
                                                    <button
                                                        onClick={async () => {
                                                            await updateMember(m.id, {
                                                                identifications: {
                                                                    ...(m.identifications || {}),
                                                                    needsPrayer: !m.identifications?.needsPrayer
                                                                }
                                                            });
                                                        }}
                                                        style={{
                                                            background: m.identifications?.needsPrayer ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                                                            border: '1px solid ' + (m.identifications?.needsPrayer ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'),
                                                            color: m.identifications?.needsPrayer ? '#ff8a8a' : 'var(--text-muted)',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.7rem',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.2rem',
                                                            transition: 'all 0.2s',
                                                            marginRight: '0.25rem'
                                                        }}
                                                        title={m.identifications?.needsPrayer ? "Quitar petición de oración" : "Marcar que necesita oración"}
                                                    >
                                                        🙏 {m.identifications?.needsPrayer ? 'Orando' : 'Orar por mí'}
                                                    </button>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '4px',
                                                        background: isHead ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                                        color: isHead ? '#fbbf24' : '#93c5fd',
                                                        fontWeight: 600
                                                    }}>
                                                        {m.identifications?.familyRole || 'Miembro'}
                                                    </span>
                                                    {canEdit && (
                                                        <button 
                                                            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0.1rem', display: 'flex' }}
                                                            onClick={async () => {
                                                                if (window.confirm(`¿Quitar a ${m.name} de la Familia ${fam.name}?`)) {
                                                                    await handleSetFamily(m.id, '', '');
                                                                }
                                                            }}
                                                            title="Quitar de la familia"
                                                        >
                                                            <UserMinus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Vincular miembro a esta familia */}
                                {canEdit && (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                        {activeFamilyKey === fam.name.toLowerCase() ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <select 
                                                    className="glass-input" 
                                                    style={{ padding: '0.3rem', fontSize: '0.8rem', width: '100%' }}
                                                    value={linkMemberId}
                                                    onChange={e => setLinkMemberId(e.target.value)}
                                                >
                                                    <option value="">-- Seleccionar familiar --</option>
                                                    {membersWithoutFamily.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name} {m.number ? `(ID: ${m.number})` : ''}</option>
                                                    ))}
                                                </select>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <select 
                                                        className="glass-input" 
                                                        style={{ padding: '0.3rem', fontSize: '0.8rem', flex: 1 }}
                                                        value={linkRole}
                                                        onChange={e => setLinkRole(e.target.value)}
                                                    >
                                                        <option value="Jefe de familia">👑 Jefe de familia</option>
                                                        <option value="Cónyuge">Cónyuge</option>
                                                        <option value="Hijo/a">Hijo/a</option>
                                                        <option value="Pariente">Pariente</option>
                                                        <option value="Otro">Otro</option>
                                                    </select>
                                                    <button 
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                                                        onClick={async () => {
                                                            if (!linkMemberId) return;
                                                            await handleSetFamily(linkMemberId, fam.name, linkRole);
                                                            setActiveFamilyKey(null);
                                                            setLinkMemberId('');
                                                            setLinkRole('Hijo/a');
                                                        }}
                                                    >
                                                        Añadir
                                                    </button>
                                                    <button 
                                                        className="btn"
                                                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)' }}
                                                        onClick={() => setActiveFamilyKey(null)}
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                className="btn"
                                                style={{ width: '100%', padding: '0.4rem', justifyContent: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)' }}
                                                onClick={() => {
                                                    setActiveFamilyKey(fam.name.toLowerCase());
                                                    setLinkMemberId('');
                                                    setLinkRole('Hijo/a');
                                                }}
                                                disabled={membersWithoutFamily.length === 0}
                                            >
                                                + Vincular Familiar Existente
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {getFamilyGroups().length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No se han registrado grupos familiares en esta plantilla. Asigna campos familiares al agregar un miembro o crea una familia arriba.
                            </div>
                        )}
                    </div>

                    {/* Miembros sin familia */}
                    {membersWithoutFamily.length > 0 && (
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Miembros sin Grupo Familiar ({membersWithoutFamily.length})
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {membersWithoutFamily.map(m => (
                                    <span key={m.id} style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.85rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        👤 {m.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === 'participants' ? (
                (() => {
                    const participants = templateMembers.filter(m => m.identifications?.isParticipant);
                    return (
                        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    👥 Usuarios Unidos ({participants.length})
                                </h3>
                            </div>
                            {participants.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                                    No hay usuarios unidos todavía.
                                </p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {participants.map(part => {
                                        const isSelf = part.name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim();
                                        return (
                                            <div key={part.id} className="glass-panel" style={{
                                                padding: '1.25rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                background: isSelf ? 'rgba(251, 191, 36, 0.05)' : 'rgba(255,255,255,0.02)',
                                                border: '1px solid ' + (isSelf ? 'rgba(251, 191, 36, 0.3)' : 'var(--border)'),
                                                borderRadius: '12px'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: isSelf ? 'rgba(251, 191, 36, 0.15)' : 'var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 'bold',
                                                    color: isSelf ? '#fbbf24' : 'var(--text-muted)'
                                                }}>
                                                    {part.name ? part.name.substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                        {part.name} {isSelf && '(Tú)'}
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        ID: #{part.number} {part.phone && `• ${part.phone}`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()
            ) : (
                <ServicesView templateId={templateId} members={templateMembers} isPoetry={isPoetry} />
            )}
                    </>
                ) : (
                    <div className="glass-panel animate-fade-in" style={{
                        padding: '4rem 2rem',
                        marginTop: '1.5rem',
                        marginBottom: '2rem',
                        textAlign: 'center',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        background: 'rgba(239, 68, 68, 0.02)',
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <ShieldAlert size={48} style={{ color: '#fca5a5', opacity: 0.6 }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Acceso de Miembros Restringido</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: 0, lineHeight: '1.6' }}>
                            Solo el usuario administrador principal <strong>keylet</strong> tiene permitido visualizar las listas de miembros, familias y control de servicios de esta plantilla.
                        </p>
                    </div>
                )
            ) : (
                /* Join template banner if not already member */
                <div className="glass-panel" style={{
                    padding: '3rem 2rem',
                    marginTop: '1.5rem',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    border: '1px solid rgba(251, 191, 36, 0.25)',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.04) 0%, rgba(15, 23, 42, 0.4) 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(251, 191, 36, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.5rem',
                        border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}>
                        <Crown size={32} color="#fbbf24" />
                    </div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: 600 }}>
                        No formas parte de esta plantilla
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
                        Para poder figurar en las listas de esta plantilla, registrar tus turnos de servicio, ver tus cronogramas y reportar si tienes la llave, debes unirte como miembro.
                    </p>
                    <button
                        className="btn btn-primary"
                        style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                            color: '#000',
                            fontWeight: 700,
                            padding: '0.8rem 2.5rem',
                            fontSize: '0.95rem',
                            marginTop: '0.5rem',
                            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.2)'
                        }}
                        onClick={async () => {
                            const maxNumber = templateMembers.reduce((max, m) => (m.number > max ? m.number : max), 0);
                            const nextNumber = maxNumber + 1;
                            
                            // Find current phone number if any from active membership
                            const phone = activeMembership?.phone || '';
                            
                            const identifications = isPoetry 
                                ? { isParticipant: true }
                                : isSonido
                                    ? { hasKey: false }
                                    : {
                                        familyRole: '',
                                        familyName: '',
                                        hasKey: false,
                                        needsPrayer: false
                                    };
                            
                            await addMember(templateId, {
                                name: currentUserFullName,
                                number: nextNumber,
                                phone: phone,
                                identifications: identifications
                            });
                        }}
                    >
                        Unirse a la Plantilla
                    </button>
                </div>
            )}

            {/* Add Member Modal */}
            <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title={isPoetry ? 'Añadir Nueva Poesía' : t('addNewMember')}>
                {isPoetry ? (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newPoemTitle.trim() || !newPoemContent.trim()) return;
                        await addMember(templateId, {
                            name: newPoemTitle.trim(),
                            phone: newPoemAuthor.trim() || 'Anónimo',
                            number: '',
                            isLeader: false,
                            identifications: {
                                content: newPoemContent.trim(),
                                isDigitized: false
                            }
                        });
                        setIsAddMemberOpen(false);
                        setNewPoemTitle('');
                        setNewPoemAuthor('');
                        setNewPoemContent('');
                    }}>
                        {/* File upload for OCR */}
                        <div style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.04)', border: '1px dashed var(--primary-glow)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
                            <Upload size={24} color="var(--primary)" />
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Digitalizar con IA (Foto, PDF o Word)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sube una foto del poema escrito a mano o impreso para transcribirlo al instante.</div>
                            <label className="btn" style={{ marginTop: '0.25rem', cursor: 'pointer', padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
                                Seleccionar Archivo
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*,application/pdf,.docx,.doc"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        setIsAddMemberOpen(false);
                                        setShowAiPanel(true);
                                        setIsDigitalizing(true);
                                        try {
                                            const { digitalizePoetry } = await import('../utils/GeminiService');
                                            const text = await digitalizePoetry(file);
                                            setAiResult(text);
                                            setAiTitle(file.name.replace(/\.[^/.]+$/, "") || 'Poesía Importada');
                                        } catch (err) {
                                            alert(`Error al digitalizar: ${err.message}`);
                                            setShowAiPanel(false);
                                        } finally {
                                            setIsDigitalizing(false);
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="input-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Título *</label>
                                <input
                                    className="glass-input"
                                    value={newPoemTitle}
                                    onChange={e => setNewPoemTitle(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Autor</label>
                                <input
                                    className="glass-input"
                                    value={newPoemAuthor}
                                    placeholder="Nombre del autor"
                                    onChange={e => setNewPoemAuthor(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Texto de la Poesía *</label>
                            <textarea
                                className="glass-input"
                                value={newPoemContent}
                                onChange={e => setNewPoemContent(e.target.value)}
                                required
                                rows={8}
                                placeholder="Escribe o pega los versos aquí..."
                                style={{ fontFamily: 'Georgia, serif', lineHeight: '1.6' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                type="button"
                                className="btn"
                                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                onClick={() => setIsAddMemberOpen(false)}
                            >
                                {t('cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Guardar Poesía
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleAddMember}>
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t('fullName')}</label>
                            <input
                                className="glass-input"
                                value={newMember.name}
                                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="input-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t('idNumber')}</label>
                                <input
                                    className="glass-input"
                                    value={newMember.number}
                                    onChange={e => setNewMember({ ...newMember, number: e.target.value })}
                                    type="number"
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t('phone')}</label>
                                <input
                                    className="glass-input"
                                    value={newMember.phone}
                                    onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                                    type="tel"
                                />
                            </div>
                        </div>

                        {/* Leadership Checkbox */}
                        <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={newMember.isLeader}
                                    onChange={e => setNewMember({ ...newMember, isLeader: e.target.checked })}
                                    style={{ cursor: 'pointer' }}
                                />
                                <Crown size={16} color="#fbbf24" />
                                {t('isLeader')}
                            </label>
                        </div>

                        {/* Family Fields */}
                        {!isSonido && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>👨‍👩‍👧‍👦 Datos de Familia (Opcional)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre de la Familia (ej. Pérez)</label>
                                        <input
                                            className="glass-input"
                                            placeholder="Apellido(s) de la familia"
                                            value={newMember.identifications?.familyName || ''}
                                            onChange={e => setNewMember({
                                                ...newMember,
                                                identifications: { ...(newMember.identifications || {}), familyName: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Rol en la Familia</label>
                                        <select
                                            className="glass-input"
                                            value={newMember.identifications?.familyRole || ''}
                                            onChange={e => setNewMember({
                                                ...newMember,
                                                identifications: { ...(newMember.identifications || {}), familyRole: e.target.value }
                                            })}
                                        >
                                            <option value="">-- Seleccionar rol --</option>
                                            <option value="Jefe de familia">👑 Jefe de familia</option>
                                            <option value="Cónyuge">Cónyuge</option>
                                            <option value="Hijo/a">Hijo/a</option>
                                            <option value="Pariente">Pariente</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {template.customFields.length > 0 && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('additionalDetails')}</h4>
                                {template.customFields.map(field => (
                                    <div key={field} className="input-group" style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{field}</label>
                                        <input
                                            className="glass-input"
                                            value={newMember.identifications[field] || ''}
                                            onChange={e => setNewMember({
                                                ...newMember,
                                                identifications: { ...newMember.identifications, [field]: e.target.value }
                                            })}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                type="button"
                                className="btn"
                                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                onClick={() => setIsAddMemberOpen(false)}
                            >
                                {t('cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary">
                                {t('addMember')}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default TemplateView;
