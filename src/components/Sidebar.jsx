import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useLanguage } from '../context/LanguageContext';
import { Users, FolderPlus, FileText, Settings as SettingsIcon, ChevronRight, BookOpen } from 'lucide-react';
import Settings from './Settings';

const Sidebar = ({ activeTemplate, onSelectTemplate, onOpenNewTemplate, onInstallApp, canInstall }) => {
    const { templates } = useStorage();
    const { t } = useLanguage();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <aside className="sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        padding: '0.5rem',
                        borderRadius: '10px',
                        boxShadow: '0 4px 12px var(--primary-glow)'
                    }}>
                        <BookOpen size={20} color="white" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                        EcclesiaSync
                    </span>
                </div>

                <button
                    onClick={onOpenNewTemplate}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        marginBottom: '2rem',
                        fontSize: '0.875rem',
                        padding: '0.875rem'
                    }}
                >
                    <FolderPlus size={18} />
                    {t('newTemplate')}
                </button>

                <div style={{ flex: 1, overflowY: 'auto', margin: '0 -0.5rem', padding: '0 0.5rem' }}>
                    <h3 style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                        fontWeight: 700
                    }}>
                        {t('yourTemplates')}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {templates.map(template => (
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
                                    fontWeight: activeTemplate === template.id ? 600 : 400
                                }}
                                className="sidebar-item"
                            >
                                <FileText size={18} opacity={activeTemplate === template.id ? 1 : 0.6} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {template.name}
                                </span>
                                {activeTemplate === template.id && <ChevronRight size={14} />}
                            </button>
                        ))}

                        {templates.length === 0 && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center', fontStyle: 'italic' }}>
                                {t('noTemplatesYet')}
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            fontSize: '0.875rem',
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
                onInstallApp={onInstallApp}
                canInstall={canInstall}
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
