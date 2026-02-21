import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateTemplatePDF } from '../utils/pdfGenerator';
import { Trash2, Edit2, UserPlus, Download, Search, ShieldAlert, Crown, Calendar, Save } from 'lucide-react';
import Modal from './Modal';
import ServicesView from './ServicesView';

const TemplateView = ({ templateId }) => {
    const { templates, members, addMember, deleteMember, updateTemplate, deleteTemplate } = useStorage();
    const { currentUser } = useAuth();
    const { t } = useLanguage();

    const template = templates.find(t => t.id === templateId);
    const templateMembers = members.filter(m => m.templateId === templateId);

    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [editTemplateName, setEditTemplateName] = useState('');
    const [activeTab, setActiveTab] = useState('members'); // 'members' or 'services'

    // Member Form State
    const [newMember, setNewMember] = useState({
        name: '',
        number: '',
        phone: '',
        accountId: '',
        isLeader: false,
        identifications: {}
    });

    if (!template) return null;

    const handleAddMember = async (e) => {
        e.preventDefault();
        await addMember(templateId, newMember);
        setIsAddMemberOpen(false);
        setNewMember({ name: '', number: '', phone: '', accountId: '', isLeader: false, identifications: {} });
    };

    const handleUpdateTemplateName = async (e) => {
        e.preventDefault();
        if (editTemplateName.trim()) {
            await updateTemplate(templateId, { name: editTemplateName });
            setIsEditingTemplate(false);
        }
    };

    const filteredMembers = templateMembers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        String(m.number).includes(searchTerm) ||
        (m.accountId && m.accountId.toLowerCase().includes(searchTerm.toLowerCase()))
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
                            <button
                                onClick={() => { setEditTemplateName(template.name); setIsEditingTemplate(true); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <Edit2 size={16} />
                            </button>
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
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAddMemberOpen(true)}
                    >
                        <UserPlus size={18} /> {t('addMember')}
                    </button>
                    {currentUser.isMaster ? (
                        <button
                            className="btn btn-danger"
                            onClick={async () => {
                                if (window.confirm(t('deleteTemplateConfirm'))) {
                                    await deleteTemplate(template.id);
                                }
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : (
                        <button
                            className="btn"
                            disabled
                            title={t('onlyMasterCanDelete')}
                            style={{
                                background: 'rgba(100, 100, 100, 0.2)',
                                cursor: 'not-allowed',
                                opacity: 0.5,
                                border: '1px solid var(--border)'
                            }}
                        >
                            <ShieldAlert size={18} />
                        </button>
                    )}
                </div>
            </header>

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
                    {t('members')}
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
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Calendar size={16} />
                    {t('services')}
                </button>
            </div>

            {activeTab === 'members' ? (
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
                                    <th>{t('accountId')}</th>
                                    <th>{t('number')}</th>
                                    <th>{t('phone')}</th>
                                    {template.customFields.map(field => (
                                        <th key={field}>{field}</th>
                                    ))}
                                    <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5 + template.customFields.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            {t('noMembersFound')}
                                        </td>
                                    </tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id}>
                                        <td style={{ fontWeight: 500, color: '#fff' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem',
                                                color: 'var(--primary)',
                                                fontWeight: 600,
                                                letterSpacing: '0.05em'
                                            }}>
                                                {member.accountId || '-'}
                                            </span>
                                        </td>
                                        <td>{member.number}</td>
                                        <td>{member.phone}</td>
                                        {template.customFields.map(field => (
                                            <td key={field}>{member.identifications[field] || '-'}</td>
                                        ))}
                                        <td style={{ textAlign: 'right' }}>
                                            {currentUser.isMaster ? (
                                                <button
                                                    className="btn-danger"
                                                    style={{ padding: '0.4rem', borderRadius: '6px' }}
                                                    onClick={async () => await deleteMember(member.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    title={t('onlyMasterCanDelete')}
                                                    style={{
                                                        padding: '0.4rem',
                                                        borderRadius: '6px',
                                                        background: 'rgba(100, 100, 100, 0.2)',
                                                        border: '1px solid var(--border)',
                                                        cursor: 'not-allowed',
                                                        opacity: 0.5
                                                    }}
                                                >
                                                    <ShieldAlert size={14} color="var(--text-muted)" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <ServicesView templateId={templateId} members={templateMembers} />
            )}

            {/* Add Member Modal */}
            <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title={t('addNewMember')}>
                <form onSubmit={handleAddMember}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t('fullName')}</label>
                        <input
                            className="glass-input"
                            value={newMember.name}
                            onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>

                    {/* Account ID */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            {t('accountIdLabel')}
                        </label>
                        <input
                            className="glass-input"
                            value={newMember.accountId}
                            onChange={e => setNewMember({ ...newMember, accountId: e.target.value.toUpperCase() })}
                            placeholder="XXXXXXXX"
                            maxLength={8}
                            style={{
                                fontFamily: 'monospace',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t('idNumber')}</label>
                            <input
                                className="glass-input"
                                value={newMember.number}
                                onChange={e => setNewMember({ ...newMember, number: e.target.value })}
                                type="number"
                            />
                        </div>
                        <div>
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

                    {/* Custom Fields */}
                    {template.customFields.length > 0 && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('additionalDetails')}</h4>
                            {template.customFields.map(field => (
                                <div key={field} style={{ marginBottom: '1rem' }}>
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
            </Modal>
        </div>
    );
};

export default TemplateView;
