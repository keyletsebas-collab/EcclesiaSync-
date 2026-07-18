import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Trash2, UserPlus, Flame, Upload, FileImage, Film, Eye } from 'lucide-react';
import AssignServiceModal from './AssignServiceModal';

const ServicesView = ({ templateId, members, isPoetry, isSonido }) => {
    const { services, addService, deleteService, updateService } = useStorage();
    const { currentUser, canEdit } = useAuth();
    const hasEditPermission = canEdit || isSonido;
    const { t } = useLanguage();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [fullScreenMedia, setFullScreenMedia] = useState(null);
    const [uploadingServiceId, setUploadingServiceId] = useState(null);

    const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const templateServices = services.filter(s => s.templateId === templateId);

    const handleAssign = (memberId, memberName, serviceDate, serviceType, assignedMembers, program) => {
        addService(templateId, memberId, memberName, serviceDate, serviceType, program, assignedMembers);
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
                    media: parsed.media || []
                };
            }
        } catch (e) {}
        return {
            type: rawType || '',
            media: []
        };
    };

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

    // Date parsing helper to extract month, year, day
    const getMonthInfo = (dateStr) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const parts = dateStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);

            const months = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            
            return {
                key: `${year}-${String(month + 1).padStart(2, '0')}`,
                monthLabel: `${months[month]} ${year}`,
                dateLabel: `${weekdays[date.getDay()]}, ${day} de ${months[month]}`,
                sortVal: date.getTime(),
                rawDate: dateStr
            };
        }
        return {
            key: 'recurring',
            monthLabel: 'Semanales / Recurrentes',
            dateLabel: dateStr,
            sortVal: 0,
            rawDate: dateStr
        };
    };

    // Group services by month
    const grouped = {};
    templateServices.forEach(service => {
        const info = getMonthInfo(service.serviceDate);
        if (!grouped[info.key]) {
            grouped[info.key] = {
                label: info.monthLabel,
                sortVal: info.sortVal,
                services: []
            };
        }
        grouped[info.key].services.push({
            ...service,
            dateLabel: info.dateLabel,
            sortDate: info.sortVal || 0,
            rawDate: info.rawDate
        });
    });

    // Sort month keys
    const sortedMonthKeys = Object.keys(grouped).sort((a, b) => {
        if (a === 'recurring') return 1;
        if (b === 'recurring') return -1;
        return a.localeCompare(b);
    });

    // Sort services inside each month
    sortedMonthKeys.forEach(key => {
        grouped[key].services.sort((a, b) => {
            if (key === 'recurring') {
                const idxA = WEEKDAYS.indexOf(a.serviceDate);
                const idxB = WEEKDAYS.indexOf(b.serviceDate);
                return idxA - idxB;
            }
            return a.rawDate.localeCompare(b.rawDate);
        });
    });

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
                            : 'Visualiza los turnos de servicio y campañas organizados por meses.'}
                    </p>
                </div>

                {hasEditPermission && (
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

            {/* List of Month Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginBottom: '3rem' }}>
                {sortedMonthKeys.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px solid var(--border)' }}>
                        No hay salidas o servicios planificados aún. ¡Comienza haciendo clic en {isPoetry ? '"Programar Salida"' : '"Asignar Día"'}!
                    </div>
                ) : (
                    sortedMonthKeys.map(monthKey => {
                        const month = grouped[monthKey];
                        return (
                            <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1.3rem',
                                    fontWeight: 800,
                                    color: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    paddingBottom: '0.35rem',
                                    borderBottom: '1.5px solid var(--primary-glow)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                }}>
                                    <span>📅</span> {month.label}
                                </h3>
                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                                    gap: '1.5rem'
                                }}>
                                    {month.services.map(service => {
                                        const { type, media } = parseServiceType(service.serviceType);
                                        const isServiceCampaign = type && type.includes('Campaña');

                                        return (
                                            <div
                                                key={service.id}
                                                style={{
                                                    background: isServiceCampaign 
                                                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)' 
                                                        : 'rgba(15, 23, 42, 0.35)',
                                                    borderRadius: '16px',
                                                    border: isServiceCampaign 
                                                        ? '1.5px solid rgba(239, 68, 68, 0.45)' 
                                                        : '1px solid var(--border)',
                                                    padding: '1.25rem',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '1rem',
                                                    position: 'relative',
                                                    boxShadow: isServiceCampaign ? '0 8px 24px rgba(239, 68, 68, 0.15)' : 'none',
                                                }}
                                            >
                                                {/* Header of the Day inside Card */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    paddingBottom: '0.75rem'
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: 700,
                                                        color: isServiceCampaign ? '#fca5a5' : 'var(--primary)',
                                                    }}>
                                                        {service.dateLabel}
                                                    </span>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {isServiceCampaign && (
                                                            <span style={{
                                                                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                                                color: '#ffffff',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 800,
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '6px',
                                                            }}>
                                                                CAMPAÑA
                                                            </span>
                                                        )}
                                                        {hasEditPermission && (
                                                            <button
                                                                className="btn-danger"
                                                                style={{
                                                                    padding: '0.35rem',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                                onClick={() => {
                                                                    if (window.confirm('¿Seguro que deseas eliminar esta asignación?')) {
                                                                        deleteService(service.id);
                                                                    }
                                                                }}
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={12} color="#f87171" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Servants / Outings Details */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        👥 {getMembersDisplay(service)}
                                                    </div>
                                                    {type && (
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: isServiceCampaign ? '#fca5a5' : 'var(--text-muted)',
                                                            fontWeight: 600
                                                        }}>
                                                            📍 Lugar/Función: {type}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Program details */}
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.35rem',
                                                    paddingTop: '0.5rem',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>📝 Programa / Actividad</label>
                                                    {hasEditPermission ? (
                                                        <textarea
                                                            className="glass-input"
                                                            placeholder="Escribe el programa o detalles de la actividad aquí..."
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
                                                        <pre style={{
                                                            margin: 0,
                                                            padding: '0.5rem',
                                                            background: 'rgba(0,0,0,0.15)',
                                                            borderRadius: '8px',
                                                            fontSize: '0.8rem',
                                                            color: 'var(--text-main)',
                                                            whiteSpace: 'pre-wrap',
                                                            fontFamily: 'inherit',
                                                            maxHeight: '120px',
                                                            overflowY: 'auto'
                                                        }}>
                                                            {service.program || 'Sin detalles del programa.'}
                                                        </pre>
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
                                                                        {hasEditPermission && (
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

                                                        {hasEditPermission && (
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
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Media full screen viewer */}
            {fullScreenMedia && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }} onClick={() => setFullScreenMedia(null)}>
                    <div style={{ maxWidth: '90%', maxHeight: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {fullScreenMedia.type === 'video' ? (
                            <video src={fullScreenMedia.data} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} />
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
                templateId={templateId}
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
