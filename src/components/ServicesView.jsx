import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Trash2, UserPlus, Flame, Upload, FileImage, Film, Eye } from 'lucide-react';
import AssignServiceModal from './AssignServiceModal';
import Modal from './Modal';

import notificationService from '../utils/NotificationService';

const parsePoetryProgram = (programStr, members = []) => {
    if (!programStr) {
        return { poems: [], notes: '' };
    }
    
    // 1. Try parsing as JSON (new format)
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

    // 2. Legacy parsing: look for "📖 Poesía:" pattern
    const poetryHeaderMarker = '📖 Poesía:';
    if (programStr.includes(poetryHeaderMarker)) {
        const startIdx = programStr.indexOf(poetryHeaderMarker);
        const titleLineEnd = programStr.indexOf('\n', startIdx);
        if (titleLineEnd !== -1) {
            const poemName = programStr.substring(startIdx + poetryHeaderMarker.length, titleLineEnd).trim();
            
            // Find poem by name in template's poems list
            const templatePoems = members.filter(m => m.identifications && !m.identifications.isParticipant);
            const foundPoem = templatePoems.find(p => p.name.toLowerCase() === poemName.toLowerCase());
            
            if (foundPoem) {
                const poemContent = foundPoem.identifications?.content || '';
                
                // Extract notes by removing the header
                let remainingText = programStr.substring(titleLineEnd + 1);
                const dashesMarker = '-----------------------';
                const dashesIdx = remainingText.indexOf(dashesMarker);
                if (dashesIdx !== -1 && dashesIdx < 40) {
                    const dashesLineEnd = remainingText.indexOf('\n', dashesIdx);
                    if (dashesLineEnd !== -1) {
                        remainingText = remainingText.substring(dashesLineEnd + 1);
                    }
                }
                
                const normalizeLines = (str) => {
                    return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim());
                };
                
                const poemLines = normalizeLines(poemContent).filter(Boolean);
                const programLines = normalizeLines(remainingText);
                
                const originalLines = remainingText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
                
                let originalLineIdx = 0;
                let poemLineIdx = 0;
                
                while (poemLineIdx < poemLines.length && originalLineIdx < originalLines.length) {
                    const origClean = originalLines[originalLineIdx].trim();
                    if (!origClean) {
                        originalLineIdx++;
                        continue;
                    }
                    
                    const poemClean = poemLines[poemLineIdx];
                    const cleanStr = (s) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '');
                    
                    if (cleanStr(origClean) === cleanStr(poemClean)) {
                        poemLineIdx++;
                    }
                    originalLineIdx++;
                }
                
                const notesText = originalLines.slice(originalLineIdx).join('\n').trim();
                
                return {
                    poems: [{
                        id: foundPoem.id,
                        name: foundPoem.name,
                        content: poemContent
                    }],
                    notes: notesText
                };
            } else {
                // Fallback if the poem is not found in the members database
                let contentStart = titleLineEnd + 1;
                const dashesMarker = '-----------------------';
                const dashesIdx = programStr.indexOf(dashesMarker, titleLineEnd);
                if (dashesIdx !== -1 && dashesIdx < titleLineEnd + 40) {
                    contentStart = programStr.indexOf('\n', dashesIdx) + 1;
                }
                
                const poemContent = programStr.substring(contentStart).trim();
                return {
                    poems: [{
                        id: 'legacy',
                        name: poemName,
                        content: poemContent
                    }],
                    notes: ''
                };
            }
        }
    }

    // 3. Simple plain text program notes (no poems)
    return {
        poems: [],
        notes: programStr || ''
    };
};

const ServicesView = ({ template, templateId, members, isPoetry, isSonido }) => {
    const { services, addService, deleteService, updateService, updateTemplate } = useStorage();
    const { currentUser, canEdit } = useAuth();
    const hasEditPermission = canEdit || isSonido;
    const { t } = useLanguage();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
    const [fullScreenMedia, setFullScreenMedia] = useState(null);
    const [uploadingServiceId, setUploadingServiceId] = useState(null);

    const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
                    media: parsed.media || [],
                    isFinished: !!parsed.isFinished
                };
            }
        } catch (e) {}
        return {
            type: rawType || '',
            media: [],
            isFinished: false
        };
    };

    const handleToggleFinishProgram = async (service) => {
        const { type, media, isFinished } = parseServiceType(service.serviceType);
        const newFinishedState = !isFinished;
        const updatedServiceTypeObj = JSON.stringify({
            type,
            media,
            isFinished: newFinishedState
        });
        await updateService(service.id, { serviceType: updatedServiceTypeObj });
        if (selectedServiceDetails && selectedServiceDetails.id === service.id) {
            setSelectedServiceDetails(prev => ({
                ...prev,
                serviceType: updatedServiceTypeObj
            }));
        }
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

    // Extract rehearsal info for poetry
    const schedulesField = template?.customFields?.find(f => f.startsWith('__rehearsalSchedules:'));
    let rehearsalSchedules = [];
    if (schedulesField) {
        try {
            rehearsalSchedules = JSON.parse(schedulesField.replace('__rehearsalSchedules:', ''));
        } catch (e) {
            rehearsalSchedules = [];
        }
    } else {
        // Fallback for the old single field format (just in case they saved it a minute ago)
        const daysField = template?.customFields?.find(f => f.startsWith('__rehearsalDays:'));
        const timeField = template?.customFields?.find(f => f.startsWith('__rehearsalTime:'));
        if (daysField || timeField) {
            rehearsalSchedules = [{
                days: daysField ? daysField.replace('__rehearsalDays:', '') : '',
                time: timeField ? timeField.replace('__rehearsalTime:', '') : '',
                modality: 'Presencial'
            }];
        }
    }

    return (
        <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
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

            {/* Rehearsal Schedule Banner for Poetry */}
            {rehearsalSchedules.length > 0 && (
                <div style={{
                    marginBottom: '2rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        padding: '0.75rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Calendar size={24} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            Horarios Habituales de Ensayo
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {rehearsalSchedules.map((schedule, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '8px', flexWrap: 'wrap' }}>
                                    {schedule.days && <span>Días: <strong>{schedule.days}</strong></span>}
                                    {schedule.days && schedule.time && <span style={{ opacity: 0.5 }}>|</span>}
                                    {schedule.time && <span>Hora: <strong>{schedule.time}</strong></span>}
                                    {(schedule.days || schedule.time) && <span style={{ opacity: 0.5 }}>|</span>}
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        fontWeight: 700, 
                                        padding: '0.15rem 0.5rem', 
                                        borderRadius: '4px',
                                        background: schedule.modality === 'Virtual' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color: schedule.modality === 'Virtual' ? '#60a5fa' : '#34d399'
                                    }}>
                                        {schedule.modality || 'Presencial'}
                                    </span>
                                    {hasEditPermission && (
                                        <button
                                            className="btn-danger"
                                            style={{
                                                padding: '0.2rem',
                                                borderRadius: '4px',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginLeft: 'auto'
                                            }}
                                            onClick={async () => {
                                                if (window.confirm('¿Seguro que deseas eliminar este horario habitual?')) {
                                                    const newSchedules = rehearsalSchedules.filter((_, i) => i !== idx);
                                                    let updatedCustomFields = (template.customFields || []).filter(f => !f.startsWith('__rehearsalSchedules:'));
                                                    if (newSchedules.length > 0) {
                                                        updatedCustomFields.push(`__rehearsalSchedules:${JSON.stringify(newSchedules)}`);
                                                    }
                                                    try {
                                                        await updateTemplate(templateId, { customFields: updatedCustomFields });
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }
                                            }}
                                            title="Eliminar Horario Habitual"
                                        >
                                            <Trash2 size={14} color="#f87171" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                                                onClick={() => setSelectedServiceDetails(service)}
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
                                                    cursor: 'pointer'
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
                                                        {parseServiceType(service.serviceType).isFinished && (
                                                            <span style={{
                                                                background: 'rgba(239, 68, 68, 0.2)',
                                                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                color: '#fca5a5',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 800,
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '6px',
                                                            }}>
                                                                🏁 FINALIZADO
                                                            </span>
                                                        )}
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
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
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
                                                    {isPoetry && (() => {
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
                                                            onClick={(e) => e.stopPropagation()}
                                                            defaultValue={isPoetry ? parsePoetryProgram(service.program, members).notes : service.program || ''}
                                                            onBlur={async (e) => {
                                                                const text = e.target.value;
                                                                const currentText = isPoetry ? parsePoetryProgram(service.program, members).notes : service.program || '';
                                                                if (text !== currentText) {
                                                                    if (isPoetry) {
                                                                        const current = parsePoetryProgram(service.program, members);
                                                                        const updatedProgram = JSON.stringify({
                                                                            poems: current.poems,
                                                                            notes: text
                                                                        });
                                                                        await updateService(service.id, { program: updatedProgram });
                                                                    } else {
                                                                        await updateService(service.id, { program: text });
                                                                    }
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
                                                            {isPoetry ? (parsePoetryProgram(service.program, members).notes || 'Sin detalles del programa.') : (service.program || 'Sin detalles del programa.')}
                                                        </pre>
                                                    )}
                                                </div>

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
                                                                    }} onClick={(e) => { e.stopPropagation(); setFullScreenMedia(item); }}>
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
                                                            <label 
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
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
                    {/* Header bar */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 2rem',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(20px)',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button 
                                    onClick={() => setSelectedServiceDetails(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-main)',
                                        borderRadius: '12px',
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                >
                                    ← Volver
                                </button>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                    {isPoetry ? 'Detalles de la Salida de Poesía' : 'Detalles de la Salida / Asignación'}
                                </h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <span>📅 <strong style={{ color: 'var(--primary)' }}>{selectedServiceDetails.dateLabel || selectedServiceDetails.serviceDate}</strong></span>
                                <span>👥 <strong style={{ color: 'var(--text-main)' }}>{getMembersDisplay(selectedServiceDetails)}</strong></span>
                                {parseServiceType(selectedServiceDetails.serviceType).type && (
                                    <span>📍 <strong style={{ color: 'var(--text-main)' }}>{parseServiceType(selectedServiceDetails.serviceType).type}</strong></span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Split content area */}
                    <div style={{
                        display: 'flex',
                        flex: 1,
                        flexWrap: 'wrap',
                        gap: '1.5rem',
                        padding: '1.5rem',
                        overflowY: 'auto',
                        boxSizing: 'border-box'
                    }}>
                        {/* Section 1: Poesías (Solo para plantillas de poesía) */}
                        {isPoetry && (
                            <div style={{
                                flex: '1 1 340px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.5rem',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '24px',
                                border: '1px solid var(--border)',
                                padding: '1.5rem',
                                boxSizing: 'border-box'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📖 Poesías a Recitar
                                </h3>
                                {(() => {
                                    const prog = parsePoetryProgram(selectedServiceDetails.program, members);
                                    return prog.poems.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {prog.poems.map((poem, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="glass-panel" 
                                                    style={{ 
                                                        padding: '1.75rem', 
                                                        borderLeft: '4px solid var(--primary)', 
                                                        background: 'rgba(255,255,255,0.015)',
                                                        borderRadius: '16px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '1rem'
                                                    }}
                                                >
                                                    <h4 style={{ 
                                                        margin: 0, 
                                                        fontSize: '1.2rem', 
                                                        fontFamily: 'Georgia, serif', 
                                                        color: 'var(--text-main)', 
                                                        fontWeight: 700,
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        paddingBottom: '0.5rem'
                                                    }}>
                                                        {poem.name}
                                                    </h4>
                                                    <div style={{
                                                        fontFamily: 'Georgia, serif',
                                                        fontSize: '1rem',
                                                        lineHeight: '1.8',
                                                        color: 'rgba(255, 255, 255, 0.85)',
                                                        whiteSpace: 'pre-wrap',
                                                        background: 'rgba(0,0,0,0.15)',
                                                        padding: '1.25rem',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.03)',
                                                        maxHeight: '350px',
                                                        overflowY: 'auto',
                                                        fontStyle: 'italic',
                                                        letterSpacing: '0.01em'
                                                    }}>
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
                        )}

                        {/* Section 2: Programa */}
                        <div style={{
                            flex: '1 1 340px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '24px',
                            border: '1px solid var(--border)',
                            padding: '1.5rem',
                            boxSizing: 'border-box'
                        }}>                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                📝 Programa / Actividad
                            </h3>
                            {hasEditPermission ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Editar Notas / Programa</label>
                                    <textarea
                                        className="glass-input"
                                        placeholder="Escribe el programa de la salida o detalles adicionales aquí..."
                                        rows={12}
                                        defaultValue={isPoetry ? parsePoetryProgram(selectedServiceDetails.program, members).notes : selectedServiceDetails.program || ''}
                                        onBlur={async (e) => {
                                            const text = e.target.value;
                                            const currentText = isPoetry ? parsePoetryProgram(selectedServiceDetails.program, members).notes : selectedServiceDetails.program || '';
                                            if (text !== currentText) {
                                                if (isPoetry) {
                                                    const current = parsePoetryProgram(selectedServiceDetails.program, members);
                                                    const updatedProgram = JSON.stringify({
                                                        poems: current.poems,
                                                        notes: text
                                                    });
                                                    await updateService(selectedServiceDetails.id, { program: updatedProgram });
                                                    setSelectedServiceDetails(prev => ({ ...prev, program: updatedProgram }));
                                                } else {
                                                    await updateService(selectedServiceDetails.id, { program: text });
                                                    setSelectedServiceDetails(prev => ({ ...prev, program: text }));
                                                }
                                            }
                                        }}
                                        style={{ 
                                            width: '100%', 
                                            flex: 1,
                                            fontSize: '0.95rem', 
                                            padding: '1.25rem', 
                                            borderRadius: '16px', 
                                            background: 'rgba(0,0,0,0.2)',
                                            lineHeight: '1.6',
                                            resize: 'none',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-main)',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Detalles del Programa</label>
                                    <pre style={{
                                        margin: 0,
                                        padding: '1.25rem',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '16px',
                                        fontSize: '0.95rem',
                                        color: 'var(--text-main)',
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'inherit',
                                        lineHeight: '1.6',
                                        flex: 1,
                                        overflowY: 'auto',
                                        border: '1px solid var(--border)'
                                    }}>
                                        {isPoetry 
                                            ? (parsePoetryProgram(selectedServiceDetails.program, members).notes || 'Sin detalles del programa.') 
                                            : (selectedServiceDetails.program || 'Sin detalles del programa.')}
                                    </pre>
                                </div>
                            )}

                            {hasEditPermission && (
                                <button
                                    type="button"
                                    onClick={() => handleToggleFinishProgram(selectedServiceDetails)}
                                    className="btn"
                                    style={{
                                        width: '100%',
                                        padding: '0.85rem',
                                        borderRadius: '14px',
                                        background: parseServiceType(selectedServiceDetails.serviceType).isFinished 
                                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)' 
                                            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)',
                                        border: parseServiceType(selectedServiceDetails.serviceType).isFinished 
                                            ? '1px solid rgba(16, 185, 129, 0.4)' 
                                            : '1px solid rgba(239, 68, 68, 0.4)',
                                        color: parseServiceType(selectedServiceDetails.serviceType).isFinished ? '#6ee7b7' : '#fca5a5',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        marginTop: '1.25rem'
                                    }}
                                >
                                    {parseServiceType(selectedServiceDetails.serviceType).isFinished 
                                        ? '✅ Programa Finalizado (Clic para reactivar)' 
                                        : '🏁 Se acabó el programa'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <AssignServiceModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                templateId={templateId}
                members={isPoetry ? members.filter(m => m.identifications?.isParticipant) : members}
                poems={isPoetry ? members.filter(m => !m.identifications?.isParticipant) : []}
                isPoetry={isPoetry}
                isSonido={isSonido}
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
