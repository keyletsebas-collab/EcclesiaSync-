import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Calendar, Trash2, UserPlus, Flame, Upload, FileImage, Film, Eye } from 'lucide-react';
import AssignServiceModal from '../AssignServiceModal';
import Modal from '../Modal';
import notificationService from '../../utils/NotificationService';

const parsePoetryProgram = (programStr, members = []) => {
    if (!programStr) {
        return { poems: [], notes: '' };
    }
    
    try {
        const parsed = JSON.parse(programStr);
        if (parsed && typeof parsed === 'object' && ('poems' in parsed || 'notes' in parsed)) {
            return {
                poems: parsed.poems || [],
                notes: parsed.notes || ''
            };
        }
    } catch (e) {
        // Fallback to legacy parsing if JSON parsing fails
    }

    const poetryHeaderMarker = '📖 Poesía:';
    if (programStr.includes(poetryHeaderMarker)) {
        const startIdx = programStr.indexOf(poetryHeaderMarker);
        const titleLineEnd = programStr.indexOf('\n', startIdx);
        if (titleLineEnd !== -1) {
            const poemName = programStr.substring(startIdx + poetryHeaderMarker.length, titleLineEnd).trim();
            const templatePoems = members.filter(m => m.identifications && !m.identifications.isParticipant);
            const foundPoem = templatePoems.find(p => p.name.toLowerCase() === poemName.toLowerCase());
            
            if (foundPoem) {
                const poemContent = foundPoem.identifications?.content || '';
                return {
                    poems: [{
                        id: foundPoem.id,
                        name: foundPoem.name,
                        content: poemContent
                    }],
                    notes: ''
                };
            }
        }
    }

    return {
        poems: [],
        notes: programStr || ''
    };
};

const PoetryServicesView = ({ template, templateId, members }) => {
    const { services, addService, deleteService, updateService } = useStorage();
    const { canEdit } = useAuth();
    const { t } = useLanguage();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
    const [fullScreenMedia, setFullScreenMedia] = useState(null);
    const [uploadingServiceId, setUploadingServiceId] = useState(null);

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

    const parseServiceType = (rawType) => {
        try {
            const parsed = JSON.parse(rawType);
            if (parsed && typeof parsed === 'object') {
                return {
                    type: parsed.type || '',
                    isCampaign: !!parsed.isCampaign
                };
            }
        } catch (e) {
            // plain string
        }
        return { type: rawType || '', isCampaign: false };
    };

    const handleAddMedia = async (service, files) => {
        if (!files || files.length === 0) return;
        setUploadingServiceId(service.id);
        try {
            const currentMedia = Array.isArray(service.media) ? [...service.media] : [];
            const newMedia = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                const fileData = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                newMedia.push({
                    id: Date.now() + Math.random().toString(36).substring(2, 7),
                    name: file.name,
                    type: file.type.startsWith('video') ? 'video' : 'image',
                    data: fileData
                });
            }

            const updatedMediaList = [...currentMedia, ...newMedia];
            await updateService(service.id, { media: updatedMediaList });
        } catch (e) {
            alert('Error al adjuntar multimedia: ' + e.message);
        } finally {
            setUploadingServiceId(null);
        }
    };

    const handleDeleteMedia = async (service, mediaId) => {
        if (!window.confirm('¿Seguro que deseas eliminar este archivo multimedia?')) return;
        const updatedMediaList = (service.media || []).filter(m => m.id !== mediaId);
        await updateService(service.id, { media: updatedMediaList });
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
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        📅 Presentaciones y Ensayos de Poesía
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Programación de salidas, poesías asignadas a recitar y material multimedia.
                    </p>
                </div>
                {canEdit && (
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setIsAssignModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <UserPlus size={16} /> Programar Salida
                    </button>
                )}
            </div>

            {sortedServices.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                        No hay salidas o presentaciones planificadas aún. ¡Comienza haciendo clic en "Programar Salida"!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {sortedServices.map((service) => {
                        const { type, isCampaign: isServiceCampaign } = parseServiceType(service.serviceType);
                        const media = Array.isArray(service.media) ? service.media : [];
                        const isUploading = uploadingServiceId === service.id;

                        return (
                            <div 
                                key={service.id} 
                                className="glass-panel" 
                                style={{ 
                                    padding: '1.25rem', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '1rem',
                                    position: 'relative',
                                    borderLeft: isServiceCampaign ? '4px solid #ef4444' : '4px solid var(--primary)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                                            📅 {service.dateLabel || service.serviceDate}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <button
                                            onClick={() => setSelectedServiceDetails(service)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                                            title="Ver detalles completos"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {canEdit && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Seguro que deseas eliminar esta salida?')) {
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
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        👥 {getMembersDisplay(service)}
                                    </div>
                                    {type && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            📍 Lugar/Función: {type}
                                        </div>
                                    )}
                                    {(() => {
                                        const prog = parsePoetryProgram(service.program, members);
                                        if (prog.poems.length > 0) {
                                            return (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                    📖 Poesías: {prog.poems.map(p => p.name).join(', ')}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>📝 Programa / Actividad</label>
                                    {canEdit ? (
                                        <textarea
                                            className="glass-input"
                                            placeholder="Escribe el programa o detalles de la actividad aquí..."
                                            rows={3}
                                            onClick={(e) => e.stopPropagation()}
                                            defaultValue={parsePoetryProgram(service.program, members).notes}
                                            onBlur={async (e) => {
                                                const text = e.target.value;
                                                const current = parsePoetryProgram(service.program, members);
                                                if (text !== current.notes) {
                                                    const updatedProgram = JSON.stringify({
                                                        poems: current.poems,
                                                        notes: text
                                                    });
                                                    await updateService(service.id, { program: updatedProgram });
                                                }
                                            }}
                                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}
                                        />
                                    ) : (
                                        <pre style={{ margin: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', maxHeight: '120px', overflowY: 'auto' }}>
                                            {parsePoetryProgram(service.program, members).notes || 'Sin detalles del programa.'}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Selected Service Full Screen Details */}
            {selectedServiceDetails && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'var(--bg-dark)',
                    backgroundImage: 'var(--bg-gradient)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 2rem',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(20px)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button 
                                onClick={() => setSelectedServiceDetails(null)}
                                className="btn"
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                ← Volver
                            </button>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                                Detalles de la Salida de Poesía
                            </h2>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem', overflowY: 'auto' }}>
                        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--border)', padding: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                                📖 Poesías a Recitar
                            </h3>
                            {(() => {
                                const prog = parsePoetryProgram(selectedServiceDetails.program, members);
                                return prog.poems.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {prog.poems.map((poem, idx) => (
                                            <div key={idx} className="glass-panel" style={{ padding: '1.75rem', borderLeft: '4px solid var(--primary)', borderRadius: '16px' }}>
                                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontFamily: 'Georgia, serif' }}>
                                                    {poem.name}
                                                </h4>
                                                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '10px', maxHeight: '350px', overflowY: 'auto', fontStyle: 'italic' }}>
                                                    {poem.content || 'Sin texto registrado.'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '3rem 0' }}>
                                        Ninguna poesía seleccionada para esta salida.
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--border)', padding: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                                📝 Programa / Actividad
                            </h3>
                            {canEdit ? (
                                <textarea
                                    className="glass-input"
                                    placeholder="Escribe el programa de la salida..."
                                    rows={12}
                                    defaultValue={parsePoetryProgram(selectedServiceDetails.program, members).notes}
                                    onBlur={async (e) => {
                                        const text = e.target.value;
                                        const current = parsePoetryProgram(selectedServiceDetails.program, members);
                                        if (text !== current.notes) {
                                            const updatedProgram = JSON.stringify({
                                                poems: current.poems,
                                                notes: text
                                            });
                                            await updateService(selectedServiceDetails.id, { program: updatedProgram });
                                            setSelectedServiceDetails(prev => ({ ...prev, program: updatedProgram }));
                                        }
                                    }}
                                    style={{ width: '100%', flex: 1, padding: '1.25rem', borderRadius: '16px' }}
                                />
                            ) : (
                                <pre style={{ margin: 0, padding: '1.25rem', background: 'rgba(0,0,0,0.15)', borderRadius: '16px', fontSize: '0.95rem', whiteSpace: 'pre-wrap', flex: 1, overflowY: 'auto' }}>
                                    {parsePoetryProgram(selectedServiceDetails.program, members).notes || 'Sin detalles registrados.'}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <AssignServiceModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                templateId={templateId}
                members={members.filter(m => m.identifications?.isParticipant)}
                poems={members.filter(m => !m.identifications?.isParticipant)}
                isPoetry={true}
                onAssign={handleAssign}
            />
        </div>
    );
};

export default PoetryServicesView;
