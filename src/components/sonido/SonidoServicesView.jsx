import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Calendar, Trash2, UserPlus, Eye, Mic, Radio, Monitor, Volume2 } from 'lucide-react';
import AssignServiceModal from '../AssignServiceModal';

const SonidoServicesView = ({ template, templateId, members }) => {
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
            return service.assignedMembers.map(m => `${m.name}${m.role ? ` (${m.role})` : ''}`).join(', ');
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
                        <Volume2 size={24} color="var(--primary)" /> Turnos y Asignaciones de Sonido
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Control y programación de operadores de consola, micrófonos, pantalla y transmisión.
                    </p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => setIsAssignModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <UserPlus size={16} /> Asignar Turno de Sonido
                </button>
            </div>

            {sortedServices.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Mic size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                        No hay turnos de sonido programados aún. Haz clic en "Asignar Turno de Sonido" para comenzar.
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
                                borderLeft: '4px solid #3b82f6'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
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
                                    <button
                                        onClick={() => {
                                            if (window.confirm('¿Seguro que deseas eliminar este turno de sonido?')) {
                                                deleteService(service.id);
                                            }
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    📌 Servicio / Evento: {service.serviceType || 'Servicio General'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    🎛️ Operadores: {getMembersDisplay(service)}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>📝 Notas de Sonido / Requerimientos</label>
                                <textarea
                                    className="glass-input"
                                    placeholder="Notas de sonido (ej: micros inalámbricos cargados, stream preparado)..."
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
                isSonido={true}
                onAssign={handleAssign}
            />
        </div>
    );
};

export default SonidoServicesView;
