import React, { useState, useEffect } from 'react';
import { useStorage } from '../context/StorageContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Users, FolderPlus, FileText, Settings as SettingsIcon, ChevronRight, ChevronLeft, Sparkles, Copy, Check, Shield, X } from 'lucide-react';
import Settings from './Settings';
import { supabase } from '../lib/supabase';

const Sidebar = ({ activeTemplate, onSelectTemplate, onOpenNewTemplate, activeView, onSelectAdmins, onSelectHistory, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
    const { templates, members } = useStorage();
    const { currentUser, activeAccountId, setActiveAccountId, canEdit, canCreateTemplate, users, updateUserRole, deleteUser } = useAuth();
    const { t } = useLanguage();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isIdCopied, setIsIdCopied] = useState(false);
    const [churchNames, setChurchNames] = useState({});

    // Filter templates for current user (Masters/Admins see all; members see only templates they belong to)
    const activeMembership = (currentUser?.memberships || []).find(m => m.id === activeAccountId || m.id === currentUser?.accountId);
    const userRole = activeMembership?.role || (currentUser?.isMaster ? 'master' : 'viewer');
    const isMasterOrAdmin = currentUser?.isMaster || userRole === 'master' || userRole === 'admin';

    const userNames = [
        currentUser?.username,
        currentUser?.name,
        ...(currentUser?.memberships || []).map(m => m.fullName || m.name)
    ].filter(Boolean).map(n => String(n).toLowerCase().trim());

    const isUserMemberOfTemplate = (templateId) => {
        if (isMasterOrAdmin) return true;
        const templateMembers = (members || []).filter(m => String(m.templateId || m.template_id) === String(templateId));
        return templateMembers.some(m => userNames.includes(String(m.name || '').toLowerCase().trim()));
    };

    // All templates visible in sidebar for any user
    const userTemplates = (templates || [])
        .filter(t => t.name !== '__church_metadata__');

    useEffect(() => {
        const fetchChurchNames = async () => {
            try {
                const { data, error } = await supabase
                    .from('templates')
                    .select('account_id, custom_fields')
                    .eq('name', '__church_metadata__');

                if (!error && data) {
                    const mapping = {};
                    data.forEach(item => {
                        const nameField = item.custom_fields?.find(f => f.startsWith('__church_name:'));
                        if (nameField) {
                            mapping[item.account_id] = nameField.replace('__church_name:', '');
                        }
                    });
                    setChurchNames(mapping);
                }
            } catch (e) {
                console.error(e);
            }
        };

        if (currentUser) {
            fetchChurchNames();
        }
    }, [currentUser]);

    const handleCopyId = () => {
        if (!activeAccountId) return;
        navigator.clipboard.writeText(activeAccountId);
        setIsIdCopied(true);
        setTimeout(() => setIsIdCopied(false), 2000);
    };

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img 
                            src="/logo.png" 
                            alt="VerbumSync Logo" 
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                            }} 
                        />
                        <span style={{ 
                            fontWeight: 800, 
                            fontSize: '1.5rem', 
                            letterSpacing: '-1px',
                            background: 'linear-gradient(to right, #fff, var(--text-muted))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            VerbumSync
                        </span>
                    </div>
                    {/* Desktop Collapse Button */}
                    <button
                        onClick={onToggleCollapse}
                        className="desktop-sidebar-collapse-btn"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s, color 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.color = 'var(--text-main)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                        title="Ocultar barra lateral"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    {/* Mobile Close Button */}
                    <button 
                        onClick={onClose} 
                        className="mobile-close-btn" 
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            display: 'none'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Account Switcher */}
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', display: 'block', letterSpacing: '0.05em' }}>
                        {t('currentAccount')}
                    </label>
                    <div style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select 
                            value={activeAccountId} 
                            onChange={(e) => setActiveAccountId(e.target.value)}
                            className="glass-input"
                            style={{ flex: 1, fontSize: '0.875rem', padding: '0.6rem 0.75rem' }}
                        >
                            {currentUser?.memberships?.map(m => (
                                <option key={m.id} value={m.id}>
                                    {churchNames[m.id] ? `${churchNames[m.id]} - ${m.id}` : m.id} ({m.role})
                                </option>
                            ))}
                        </select>
                        <button 
                            onClick={handleCopyId}
                            className="btn"
                            title={t('copyId') || 'Copiar ID'}
                            style={{ 
                                padding: '0.6rem', 
                                background: 'var(--bg-glass)', 
                                border: '1px solid var(--border)',
                                color: isIdCopied ? 'var(--primary)' : 'var(--text-muted)'
                            }}
                        >
                            {isIdCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {canCreateTemplate && (
                    <button
                        onClick={onOpenNewTemplate}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            marginBottom: '2rem',
                            fontSize: '0.95rem',
                            padding: '0.875rem'
                        }}
                    >
                        <FolderPlus size={20} />
                        {t('newTemplate')}
                    </button>
                )}

                <div style={{ flex: 1, overflowY: 'auto', margin: '0 -0.5rem', padding: '0 0.5rem' }}>
                    <h3 style={{
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                        fontWeight: 700
                    }}>
                        {t('yourTemplates')}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {userTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => onSelectTemplate(template.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: activeTemplate === template.id ? 'var(--bg-glass)' : 'transparent',
                                    color: activeTemplate === template.id ? 'var(--primary)' : 'var(--text-main)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                    textAlign: 'left',
                                    fontSize: '0.95rem',
                                    fontWeight: activeTemplate === template.id ? 600 : 400
                                }}
                                className="sidebar-item"
                            >
                                <FileText size={18} opacity={activeTemplate === template.id ? 1 : 0.6} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {template.name}
                                </span>
                                {activeTemplate === template.id && <ChevronRight size={16} />}
                            </button>
                        ))}

                        {userTemplates.length === 0 && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center', fontStyle: 'italic' }}>
                                {t('noTemplatesYet')}
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={onSelectHistory}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            border: activeView === 'history' ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: activeView === 'history' ? 'var(--primary-glow)' : 'var(--bg-glass)',
                            color: activeView === 'history' ? '#fff' : 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            fontSize: '0.95rem',
                            fontWeight: 500
                        }}
                        className="sidebar-item"
                    >
                        <FileText size={18} opacity={activeView === 'history' ? 1 : 0.6} />
                        Historia
                    </button>
                    {currentUser?.username?.toLowerCase() === 'keylet' && (
                        <button
                            onClick={onSelectAdmins}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                border: activeView === 'admins' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: activeView === 'admins' ? 'var(--primary-glow)' : 'var(--bg-glass)',
                                color: activeView === 'admins' ? '#fff' : 'var(--text-main)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: '100%',
                                fontSize: '0.95rem',
                                fontWeight: 500
                            }}
                            className="sidebar-item"
                        >
                            <Shield size={18} opacity={activeView === 'admins' ? 1 : 0.6} />
                            Admins
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-glass)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            fontSize: '0.95rem',
                            fontWeight: 500
                        }}
                    >
                        <SettingsIcon size={18} />
                        {t('settings')}
                    </button>
                </div>
            </aside>

            <Settings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />



            <style>{`
                .sidebar-item:hover {
                    background: var(--bg-glass) !important;
                    transform: translateX(4px);
                }
            `}</style>
        </>
    );
};

export default Sidebar;
