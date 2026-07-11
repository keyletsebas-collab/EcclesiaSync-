import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Trash2, UserPlus, Flame, Upload, FileImage, Film, Eye } from 'lucide-react';
import AssignServiceModal from './AssignServiceModal';

const ServicesView = ({ templateId, members, isPoetry }) => {
    const { services, addService, deleteService, updateService } = useStorage();
    const { currentUser, canEdit } = useAuth();
    const { t } = useLanguage();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [fullScreenMedia, setFullScreenMedia] = useState(null);
    const [uploadingServiceId, setUploadingServiceId] = useState(null);

    const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const templateServices = services.filter(s => s.templateId === templateId);

    const handleAssign = (memberId, memberName, serviceDate, serviceType) => {
        addService(templateId, memberId, memberName, serviceDate, serviceType);
    };

    // Helper to parse JSON payload inside serviceType
    const parseServiceType = (rawType) => {
        try {
            const parsed = JSON.parse(rawType);
            if (parsed && typeof parsed === 'object') {
                return {
                    type: parsed.type || '',
                    media: parsed.media || []
                };
            }
        } catch (e) {}
        return {
            type: rawType || '',
            media: []
        };
    };

    // Handler to upload photo/video
    const handleAddMedia = async (service, files) => {
        if (!files || files.length === 0) return;
        setUploadingServiceId(service.id);

        const { type, media } = parseServiceType(service.serviceType);
        
        const toBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });

        const newMedia = [...media];
        for (let file of files) {
            try {
                // Check file size (recommend limit under 15MB to prevent network delays)
                if (file.size > 15 * 1024 * 1024) {
                    alert(`El archivo ${file.name} es demasiado grande. Límite máximo: 15MB.`);
                    continue;
                }
                const base64 = await toBase64(file);
                newMedia.push({
                    type: file.type.startsWith('video/') ? 'video' : 'image',
                    data: base64,
                    name: file.name
                });
            } catch (err) {
                console.error('Error al codificar el archivo:', err);
            }
        }

        try {
            const updatedType = JSON.stringify({ type, media: newMedia });
            await updateService(service.id, { serviceType: updatedType });
        } catch (err) {
            alert(`Error al guardar multimedia: ${err.message}`);
        } finally {
            setUploadingServiceId(null);
        }
    };

    // Handler to remove photo/video
    const handleRemoveMedia = async (service, mediaIndex) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta foto/video?')) return;
        const { type, media } = parseServiceType(service.serviceType);
        const newMedia = media.filter((_, idx) => idx !== mediaIndex);
        
        try {
            const updatedType = JSON.stringify({ type, media: newMedia });
            await updateService(service.id, { serviceType: updatedType });
        } catch (err) {
            alert(`Error al eliminar multimedia: ${err.message}`);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                background: 'var(--bg-glass)',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(12px)'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                        <Calendar size={28} color="var(--primary)" />
                        {isPoetry ? '📅 Presentaciones y Ensayos' : t('servicesSchedule') || 'Distribución de Cultos/Servicios'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                        {isPoetry 
                            ? 'Planifica y gestiona las salidas, recitales y los ensayos programados para el grupo de poesía.'
                            : 'Visualiza los turnos semanales de servicio y campañas organizados por días.'}
                    </p>
                </div>

                {canEdit && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAssignModalOpen(true)}
                        style={{
                            padding: '0.8rem 1.4rem',
                            fontSize: '1rem',
                            borderRadius: '12px',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        <UserPlus size={18} />
                        {isPoetry ? 'Programar Salida' : 'Asignar Día'}
                    </button>
                )}
            </header>

            {/* Grid of Weekday Groups */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                {WEEKDAYS.map(dayName => {
                    const dayServices = templateServices.filter(s => s.serviceDate === dayName);
                    const hasCampaign = dayServices.some(s => {
                        const { type } = parseServiceType(s.serviceType);
                        return type && type.includes('Campaña');
                    });

                    return (
                        <div
                            key={dayName}
                            style={{
                                background: hasCampaign 
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)' 
                                    : 'rgba(15, 23, 42, 0.35)',
                                borderRadius: '16px',
                                border: hasCampaign 
                                    ? '1.5px solid rgba(239, 68, 68, 0.45)' 
                                    : '1px solid var(--border)',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                transition: 'all 0.3s ease',
                                boxShadow: hasCampaign ? '0 8px 24px rgba(239, 68, 68, 0.15)' : 'none',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Campaign fire glow effect */}
                            {hasCampaign && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-40px',
                                    right: '-40px',
                                    width: '100px',
                                    height: '100px',
                                    background: 'rgba(239, 68, 68, 0.25)',
                                    filter: 'blur(30px)',
                                    borderRadius: '50%',
                                    pointerEvents: 'none'
                                }} />
                            )}

                            {/* Header of the Day */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                paddingBottom: '0.75rem'
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: hasCampaign ? '#fca5a5' : 'var(--text-main)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    {dayName}
                                </h3>

                                {hasCampaign && (
                                    <span style={{
                                        background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                        color: '#ffffff',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '8px',
                                        letterSpacing: '0.05em',
                                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        animation: 'pulse 2s infinite'
                                    }}>
                                        <Flame size={10} /> CAMPAÑA
                                    </span>
                                )}
                            </div>

                            {/* Servants list for this day */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                                {dayServices.length === 0 ? (
                                    <div style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85rem',
                                        fontStyle: 'italic',
                                        textAlign: 'center',
                                        padding: '2rem 1rem'
                                    }}>
                                        Sin asignaciones
                                    </div>
                                ) : (
                                    dayServices.map(service => {
                                        const { type, media } = parseServiceType(service.serviceType);
                                        const isServiceCampaign = type && type.includes('Campaña');

                                        return (
                                            <div
                                                key={service.id}
                                                style={{
                                                    padding: '1rem',
                                                    background: isServiceCampaign 
                                                        ? 'rgba(239, 68, 68, 0.08)' 
                                                        : 'rgba(15, 23, 42, 0.5)',
                                                    borderRadius: '12px',
                                                    border: isServiceCampaign 
                                                        ? '1px solid rgba(239, 68, 68, 0.2)' 
                                                        : '1px solid rgba(255,255,255,0.03)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ flex: 1, marginRight: '0.5rem' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                                            {service.memberName}
                                                        </div>
                                                        {type && (
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                color: isServiceCampaign ? '#fca5a5' : 'var(--text-muted)',
                                                                marginTop: '0.2rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}>
                                                                {isServiceCampaign && <Flame size={12} />}
                                                                {type}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {canEdit && (
                                                        <button
                                                            className="btn-danger"
                                                            style={{
                                                                padding: '0.45rem',
                                                                borderRadius: '8px',
                                                                background: 'rgba(239, 68, 68, 0.15)',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => deleteService(service.id)}
                                                            title="Eliminar asignación"
                                                        >
                                                            <Trash2 size={14} color="#f87171" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Multimedia section for Poetry */}
                                                {isPoetry && (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.5rem',
                                                        paddingTop: '0.5rem',
                                                        borderTop: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        {/* Visual Grid of media */}
                                                        {media.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                {media.map((item, idx) => (
                                                                    <div key={idx} className="prayer-pulsing-badge" style={{
                                                                        position: 'relative',
                                                                        width: '56px',
                                                                        height: '56px',
                                                                        borderRadius: '8px',
                                                                        overflow: 'hidden',
                                                                        border: '1px solid var(--border)',
                                                                        cursor: 'pointer',
                                                                        background: '#000'
                                                                    }} onClick={() => setFullScreenMedia(item)}>
                                                                        {item.type === 'video' ? (
                                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                                                <video src={item.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                    <Film size={14} color="white" />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <img src={item.data} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                        )}
                                                                        {canEdit && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRemoveMedia(service, idx);
                                                                                }}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    top: '-2px',
                                                                                    right: '-2px',
                                                                                    background: 'var(--red)',
                                                                                    color: '#fff',
                                                                                    border: 'none',
                                                                                    borderRadius: '50%',
                                                                                    width: '16px',
                                                                                    height: '16px',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: 800,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    cursor: 'pointer',
                                                                                    zIndex: 5
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Action to Upload */}
                                                        {canEdit && (
                                                            <label style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '0.35rem',
                                                                fontSize: '0.75rem',
                                                                color: 'var(--primary)',
                                                                cursor: 'pointer',
                                                                padding: '0.4rem 0.75rem',
                                                                borderRadius: '8px',
                                                                background: 'rgba(99, 102, 241, 0.08)',
                                                                border: '1px dashed var(--primary)',
                                                                alignSelf: 'flex-start',
                                                                marginTop: '0.25rem',
                                                                pointerEvents: uploadingServiceId === service.id ? 'none' : 'auto',
                                                                opacity: uploadingServiceId === service.id ? 0.6 : 1
                                                            }}>
                                                                <Upload size={12} />
                                                                {uploadingServiceId === service.id ? 'Subiendo...' : 'Adjuntar Foto/Video'}
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    accept="image/*,video/*"
                                                                    style={{ display: 'none' }}
                                                                    onChange={(e) => handleAddMedia(service, e.target.files)}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Full-Screen Media Modal */}
            {fullScreenMedia && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(15, 23, 42, 0.95)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    padding: '2rem',
                    backdropFilter: 'blur(20px)'
                }} onClick={() => setFullScreenMedia(null)}>
                    <button style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        fontSize: '1.25rem',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700'
                    }}>×</button>

                    <div style={{ maxWidth: '85vw', maxHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {fullScreenMedia.type === 'video' ? (
                            <video src={fullScreenMedia.data} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                        ) : (
                            <img src={fullScreenMedia.data} alt={fullScreenMedia.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                        )}
                    </div>
                    <p style={{ color: 'white', marginTop: '1.5rem', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.02em', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {fullScreenMedia.name || 'Multimedia Adjunta'}
                    </p>
                </div>
            )}

            <AssignServiceModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                members={members}
                onAssign={handleAssign}
            />

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ServicesView;
