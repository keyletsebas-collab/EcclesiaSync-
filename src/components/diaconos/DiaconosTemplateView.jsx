import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateTemplatePDF } from '../../utils/pdfGenerator';
import { Trash2, Edit2, UserPlus, Download, Search, Users, Key, Heart, Save } from 'lucide-react';
import Modal from '../Modal';
import DiaconosServicesView from './DiaconosServicesView';
import ProgramsView from '../shared/ProgramsView';
import FinancesView from '../shared/FinancesView';
import notificationService from '../../utils/NotificationService';

const DiaconosTemplateView = ({ templateId, onDeleted }) => {
    const { templates, members, addMember, deleteMember, updateTemplate, deleteTemplate, updateMember } = useStorage();
    const { currentUser, canEdit, users } = useAuth();
    const { t } = useLanguage();

    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('members'); // 'members', 'services', 'programs', 'finances', 'settings'

    // Form state for adding deacon/member
    const [newMember, setNewMember] = useState({
        name: '',
        number: '',
        phone: '',
        isLeader: false,
        hasKey: false,
        needsPrayer: false
    });

    const [editTemplateName, setEditTemplateName] = useState('');
    const [editTemplatePassword, setEditTemplatePassword] = useState('');
    const [editStaffMeetingSchedules, setEditStaffMeetingSchedules] = useState([]);

    const template = templates.find(t => t.id === templateId);
    const templateMembers = members.filter(m => m.templateId === templateId);

    const activeMembership = currentUser?.memberships?.find(m => m.id === template?.accountId);
    const currentUserFullName = activeMembership?.fullName || currentUser?.username || '';
    const isCurrentUserAdded = templateMembers.some(m => m.name?.toLowerCase().trim() === currentUserFullName.toLowerCase().trim());

    // Church Users list
    const churchUsers = (users || []).map(u => {
        const membership = u.memberships?.find(m => m.id === template?.accountId);
        const name = membership?.fullName || u.username;
        const phone = membership?.phone || u.phone || '';
        return { uid: u.uid, name, phone };
    }).filter(u => u.name);

    const handleSyncAllChurchUsers = async () => {
        const existingNames = new Set(templateMembers.map(m => m.name?.toLowerCase().trim()));
        let addedCount = 0;
        for (const u of churchUsers) {
            if (u.name && !existingNames.has(u.name.toLowerCase().trim())) {
                const maxNumber = templateMembers.reduce((max, mem) => (mem.number > max ? mem.number : max), 0);
                await addMember(templateId, {
                    name: u.name,
                    number: maxNumber + 1 + addedCount,
                    phone: u.phone || '',
                    identifications: {
                        hasKey: false,
                        needsPrayer: false
                    }
                });
                addedCount++;
            }
        }
        if (addedCount > 0) {
            alert(`Se han añadido ${addedCount} usuario(s) de la iglesia a la plantilla.`);
        } else {
            alert('Todos los usuarios registrados ya forman parte de esta plantilla.');
        }
    };

    const handleAddSelf = async () => {
        if (!currentUserFullName) return;
        const maxNumber = templateMembers.reduce((max, mem) => (mem.number > max ? mem.number : max), 0);
        await addMember(templateId, {
            name: currentUserFullName,
            number: maxNumber + 1,
            phone: activeMembership?.phone || '',
            identifications: {
                hasKey: false,
                needsPrayer: false
            }
        });
    };

    React.useEffect(() => {
        if (template) {
            setEditTemplateName(template.name || '');
            const pwdField = template.customFields?.find(f => f.startsWith('__password:'));
            setEditTemplatePassword(pwdField ? pwdField.replace('__password:', '') : '');
            const schedulesField = template.customFields?.find(f => f.startsWith('__staffMeetingSchedules:') || f.startsWith('__rehearsalSchedules:'));
            if (schedulesField) {
                try {
                    const prefix = schedulesField.startsWith('__staffMeetingSchedules:') ? '__staffMeetingSchedules:' : '__rehearsalSchedules:';
                    setEditStaffMeetingSchedules(JSON.parse(schedulesField.replace(prefix, '')));
                } catch (e) {
                    setEditStaffMeetingSchedules([]);
                }
            } else {
                setEditStaffMeetingSchedules([]);
            }
        }
    }, [templateId, templates]);

    if (!template) return null;

    const filteredMembers = templateMembers.filter(m => 
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMember.name.trim()) return;

        await addMember(templateId, {
            name: newMember.name.trim(),
            number: newMember.number.trim(),
            phone: newMember.phone.trim(),
            isLeader: newMember.isLeader,
            identifications: {
                hasKey: newMember.hasKey,
                needsPrayer: newMember.needsPrayer
            }
        });

        if (newMember.needsPrayer) {
            try {
                await notificationService.notifyPrayerRequestCreated(newMember.name.trim());
            } catch (e) {
                console.error(e);
            }
        }

        setNewMember({
            name: '',
            number: '',
            phone: '',
            isLeader: false,
            hasKey: false,
            needsPrayer: false
        });
        setIsAddMemberOpen(false);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <header className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{template.name}</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            👥 Lista de Diáconos y Miembros ({templateMembers.length} registrados)
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {!isCurrentUserAdded && currentUserFullName && (
                        <button 
                            className="btn"
                            onClick={handleAddSelf}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399' }}
                        >
                            <UserPlus size={16} /> Añadirme a esta plantilla
                        </button>
                    )}

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
                            <UserPlus size={16} /> Añadir Diácono / Miembro
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
                    👥 Miembros ({templateMembers.length})
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
                    📅 Cronograma de Cultos
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

            {/* TAB: Members */}
            {activeTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', maxWidth: '400px', gap: '0.5rem' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono o familia..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none' }}
                        />
                    </div>

                    {filteredMembers.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No hay miembros registrados.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                            {filteredMembers.map(member => (
                                <div key={member.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: member.identifications?.needsPrayer ? '4px solid #ef4444' : member.identifications?.hasKey ? '4px solid #fbbf24' : '4px solid var(--primary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{member.name}</h4>
                                        </div>
                                        {canEdit && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Seguro que deseas eliminar este miembro?')) {
                                                        deleteMember(member.id);
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                        {member.phone && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                📞 {member.phone}
                                            </span>
                                        )}
                                        {member.identifications?.hasKey && (
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Key size={12} /> Tiene Llave
                                            </span>
                                        )}
                                        {member.identifications?.needsPrayer && (
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ff8a8a', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Heart size={12} /> Petición de Oración
                                            </span>
                                        )}
                                    </div>

                                    {canEdit && (
                                        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                onClick={async () => {
                                                    await updateMember(member.id, {
                                                        identifications: {
                                                            ...(member.identifications || {}),
                                                            hasKey: !member.identifications?.hasKey
                                                        }
                                                    });
                                                }}
                                            >
                                                🔑 {member.identifications?.hasKey ? 'Quitar Llave' : 'Asignar Llave'}
                                            </button>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                                onClick={async () => {
                                                    const nextState = !member.identifications?.needsPrayer;
                                                    await updateMember(member.id, {
                                                        identifications: {
                                                            ...(member.identifications || {}),
                                                            needsPrayer: nextState
                                                        }
                                                    });
                                                    if (nextState) {
                                                        try {
                                                            await notificationService.notifyPrayerRequestCreated(member.name);
                                                        } catch (e) {}
                                                    }
                                                }}
                                            >
                                                🙏 {member.identifications?.needsPrayer ? 'Quitar Oración' : 'Pedir Oración'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Services / Cultos */}
            {activeTab === 'services' && (
                <DiaconosServicesView template={template} templateId={templateId} members={templateMembers} />
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

                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', marginTop: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>👥 Horarios de Reunión de Personal</span>
                                {canEdit && (
                                    <button 
                                        type="button" 
                                        className="btn" 
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                                        onClick={() => setEditStaffMeetingSchedules([...editStaffMeetingSchedules, { days: '', time: '', modality: 'Presencial' }])}
                                    >
                                        <UserPlus size={14} /> Añadir Horario
                                    </button>
                                )}
                            </h4>
                            
                            {editStaffMeetingSchedules.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                    No hay horarios de reunión de personal configurados.
                                </div>
                            ) : (
                                editStaffMeetingSchedules.map((schedule, index) => (
                                    <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(130px, 1fr) auto auto', gap: '0.75rem', alignItems: 'end', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Días</label>
                                            <input
                                                className="glass-input"
                                                value={schedule.days}
                                                onChange={(e) => {
                                                    const newSchedules = [...editStaffMeetingSchedules];
                                                    newSchedules[index].days = e.target.value;
                                                    setEditStaffMeetingSchedules(newSchedules);
                                                }}
                                                disabled={!canEdit}
                                                placeholder="Ej: Sábados"
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
                                                    const newSchedules = [...editStaffMeetingSchedules];
                                                    newSchedules[index].time = e.target.value;
                                                    setEditStaffMeetingSchedules(newSchedules);
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
                                                    const newSchedules = [...editStaffMeetingSchedules];
                                                    newSchedules[index].modality = schedule.modality === 'Presencial' ? 'Virtual' : 'Presencial';
                                                    setEditStaffMeetingSchedules(newSchedules);
                                                }}
                                                style={{
                                                    padding: '0.4rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    border: '1px solid ' + (schedule.modality === 'Virtual' ? '#3b82f6' : '#10b981'),
                                                    background: schedule.modality === 'Virtual' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: schedule.modality === 'Virtual' ? '#60a5fa' : '#34d399',
                                                    cursor: canEdit ? 'pointer' : 'default',
                                                    minWidth: '85px'
                                                }}
                                            >
                                                {schedule.modality || 'Presencial'}
                                            </button>
                                        </div>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                style={{ padding: '0.4rem 0.6rem', borderRadius: '10px' }}
                                                onClick={() => {
                                                    const newSchedules = editStaffMeetingSchedules.filter((_, i) => i !== index);
                                                    setEditStaffMeetingSchedules(newSchedules);
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
                                    let updatedCustomFields = (template.customFields || []).filter(f => !f.startsWith('__password:') && !f.startsWith('__staffMeetingSchedules:') && !f.startsWith('__rehearsalSchedules:'));
                                    if (editTemplatePassword.trim()) {
                                        updatedCustomFields.push(`__password:${editTemplatePassword.trim()}`);
                                    }
                                    if (editStaffMeetingSchedules.length > 0) {
                                        const validSchedules = editStaffMeetingSchedules.filter(s => s.days.trim() || s.time.trim());
                                        if (validSchedules.length > 0) {
                                            updatedCustomFields.push(`__staffMeetingSchedules:${JSON.stringify(validSchedules)}`);
                                            const meetingDetails = validSchedules.map(s => `${s.days} ${s.time}`.trim()).join(', ');
                                            notificationService.notifyDiaconosMeetingCreated(meetingDetails);
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

            {/* Add Member Modal */}
            <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Añadir Diácono / Miembro">
                <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nombre Completo</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newMember.name}
                            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                            required
                            placeholder="Ej: Pedro Pérez"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Teléfono</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newMember.phone}
                            onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                            placeholder="Número de teléfono"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                                type="checkbox"
                                checked={newMember.hasKey}
                                onChange={(e) => setNewMember({ ...newMember, hasKey: e.target.checked })}
                            />
                            🔑 Tiene llave de la iglesia
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                                type="checkbox"
                                checked={newMember.needsPrayer}
                                onChange={(e) => setNewMember({ ...newMember, needsPrayer: e.target.checked })}
                            />
                            🙏 Necesita oración
                        </label>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                        Guardar Miembro
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default DiaconosTemplateView;
