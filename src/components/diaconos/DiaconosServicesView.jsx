import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Calendar, Trash2, UserPlus, Eye, Users, Key, Heart } from 'lucide-react';
import AssignServiceModal from '../AssignServiceModal';

const DiaconosServicesView = ({ template, templateId, members }) => {
    const { services, addService, deleteService, updateService } = useStorage();
    const { canEdit } = useAuth();
    const { t } = useLanguage();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);

    const templateServices = services.filter(s => s.templateId === templateId);

    const handleAssign = async (memberId, memberName, serviceDate, serviceType, assignedMembers, program) => {
        await addService(templateId, memberId, memberName, serviceDate, serviceType, program, assignedMembers);
    };

    const getMembersDisplay = (service) => {
        if (service.assignedMembers && service.assignedMembers.length > 0) {
            return service.assignedMembers.map(m => m.name).join(', ');
        }
        return service.memberName;
    };

    const sortedServices = [...templateServices].sort((a, b) => {
        const dateA = a.serviceDate || a.service_date || '';
        const dateB = b.serviceDate || b.service_date || '';
        return dateA.localeCompare(dateB);
    });

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={24} color="var(--primary)" /> Cronograma de Servicios y Cultos
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Distribución de diáconos y servidores para cultos, reuniones y actividades.
                    </p>
                </div>
                {canEdit && (
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setIsAssignModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <UserPlus size={16} /> Asignar Día / Servicio
                    </button>
                )}
            </div>

            {sortedServices.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                        No hay servicios programados aún. Haz clic en "Asignar Día / Servicio" para comenzar.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {sortedServices.map((service) => (
                        <div 
                            key={service.id} 
                            className="glass-panel" 
                            style={{ 
                                padding: '1.25rem', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '1rem',
                                borderLeft: '4px solid var(--primary)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                                    📅 {service.dateLabel || service.serviceDate}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => setSelectedServiceDetails(service)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                                        title="Ver detalles"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {canEdit && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('¿Seguro que deseas eliminar esta asignación?')) {
                                                    deleteService(service.id);
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    ⛪ Servicio: {service.serviceType || 'Culto General'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    👥 Servidores: {getMembersDisplay(service)}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>📝 Orden de Servicio / Notas</label>
                                {canEdit ? (
                                    <textarea
                                        className="glass-input"
                                        placeholder="Detalles del servicio u orden del culto..."
                                        rows={3}
                                        defaultValue={service.program || ''}
                                        onBlur={async (e) => {
                                            const text = e.target.value;
                                            if (text !== (service.program || '')) {
                                                await updateService(service.id, { program: text });
                                            }
                                        }}
                                        style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}
                                    />
                                ) : (
                                    <pre style={{ margin: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto' }}>
                                        {service.program || 'Sin detalles registrados.'}
                                    </pre>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AssignServiceModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                templateId={templateId}
                members={members}
                onAssign={handleAssign}
            />
        </div>
    );
};

export default DiaconosServicesView;
