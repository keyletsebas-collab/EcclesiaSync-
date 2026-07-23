import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStorage } from '../context/StorageContext';
import Modal from './Modal';
import { Calendar, Users, Flame, Info } from 'lucide-react';

const AssignServiceModal = ({ isOpen, onClose, templateId, members, poems = [], isPoetry, isSonido, onAssign }) => {
    const { t } = useLanguage();
    const { programs } = useStorage();
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [serviceType, setServiceType] = useState('');
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [selectedPoemIds, setSelectedPoemIds] = useState([]);
    const [isCampaign, setIsCampaign] = useState(false);
    const [eventType, setEventType] = useState('regular'); // 'regular', 'rehearsal', 'outing', 'campaign'

    const templatePrograms = (programs || []).filter(p => p.templateId === templateId);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedMemberIds.length === 0 || !serviceDate) {
            alert('Por favor selecciona al menos un miembro.');
            return;
        }

        const selectedMembers = selectedMemberIds.map(id => {
            const m = members.find(x => x.id === id);
            return { id: m.id, name: m.name };
        });

        const primaryMember = selectedMembers[0];
        let finalServiceType = serviceType.trim();
        if (eventType === 'rehearsal') {
            finalServiceType = finalServiceType 
                ? (finalServiceType.toLowerCase().includes('ensayo') ? finalServiceType : `Ensayo - ${finalServiceType}`) 
                : 'Ensayo';
        } else if (eventType === 'outing') {
            finalServiceType = finalServiceType 
                ? (finalServiceType.toLowerCase().includes('salida') ? finalServiceType : `Salida - ${finalServiceType}`) 
                : 'Salida';
        } else if (eventType === 'campaign' || isCampaign) {
            finalServiceType = finalServiceType 
                ? (finalServiceType.toLowerCase().includes('campaña') ? finalServiceType : `Campaña - ${finalServiceType}`) 
                : 'Campaña';
        }
        const selectedProgram = templatePrograms.find(p => p.id === selectedProgramId);
        let programText = selectedProgram ? `=== ${selectedProgram.title} ===\n${selectedProgram.content}` : '';

        if (isPoetry) {
            const selectedPoems = selectedPoemIds.map(id => {
                const poem = poems.find(p => p.id === id);
                return poem ? {
                    id: poem.id,
                    name: poem.name,
                    content: poem.identifications?.content || ''
                } : null;
            }).filter(Boolean);
            programText = JSON.stringify({
                poems: selectedPoems,
                notes: programText
            });
        }

        onAssign(primaryMember.id, primaryMember.name, serviceDate, finalServiceType, selectedMembers, programText);

        // Reset
        setSelectedMemberIds([]);
        setServiceDate(new Date().toISOString().split('T')[0]);
        setServiceType('');
        setSelectedProgramId('');
        setSelectedPoemIds([]);
        setIsCampaign(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('assignService') || 'Asignar Servicio'}>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Users size={16} color="var(--primary)" />
                        Seleccionar Miembros (Puedes elegir varios)
                    </label>
                    <div style={{
                        maxHeight: '180px',
                        overflowY: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.01)'
                    }}>
                        {members.map(member => {
                            const isChecked = selectedMemberIds.includes(member.id);
                            return (
                                <label key={member.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.4rem 0',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.02)'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            if (isChecked) {
                                                setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                                            } else {
                                                setSelectedMemberIds([...selectedMemberIds, member.id]);
                                            }
                                        }}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.875rem' }}>
                                        {member.name} {member.number ? `(#${member.number})` : ''}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Calendar size={16} color="var(--primary)" />
                        Seleccionar Fecha de Salida
                    </label>
                    <input
                        type="date"
                        className="glass-input"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                    />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        📖 Adjuntar Programa Guardado (Opcional)
                    </label>
                    <select
                        className="glass-input"
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                    >
                        <option value="">-- Ninguno (Escribir manualmente en agenda) --</option>
                        {templatePrograms.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title}
                            </option>
                        ))}
                    </select>
                </div>

                {isPoetry && poems.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            📝 Seleccionar Poesías a Recitar (Puedes elegir varias)
                        </label>
                        <div style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.01)'
                        }}>
                            {poems.map(poem => {
                                const isChecked = selectedPoemIds.includes(poem.id);
                                return (
                                    <label key={poem.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.4rem 0',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.02)'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                if (isChecked) {
                                                    setSelectedPoemIds(selectedPoemIds.filter(id => id !== poem.id));
                                                } else {
                                                    setSelectedPoemIds([...selectedPoemIds, poem.id]);
                                                }
                                            }}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.875rem' }}>
                                            📖 {poem.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Tipo de Actividad / Evento
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: isPoetry ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => { setEventType('regular'); setIsCampaign(false); }}
                            style={{
                                padding: '0.6rem 0.3rem',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: eventType === 'regular' && !isCampaign ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: eventType === 'regular' && !isCampaign ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)',
                                color: eventType === 'regular' && !isCampaign ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            📅 Servicio
                        </button>
                        {isPoetry && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setEventType('rehearsal'); setIsCampaign(false); }}
                                    style={{
                                        padding: '0.6rem 0.3rem',
                                        borderRadius: '10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: eventType === 'rehearsal' ? '1px solid #3b82f6' : '1px solid var(--border)',
                                        background: eventType === 'rehearsal' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                                        color: eventType === 'rehearsal' ? '#93c5fd' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    🎼 Ensayo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEventType('outing'); setIsCampaign(false); }}
                                    style={{
                                        padding: '0.6rem 0.3rem',
                                        borderRadius: '10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: eventType === 'outing' ? '1px solid #8b5cf6' : '1px solid var(--border)',
                                        background: eventType === 'outing' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                                        color: eventType === 'outing' ? '#c4b5fd' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    🚌 Salida
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => { setEventType('campaign'); setIsCampaign(true); }}
                            style={{
                                padding: '0.6rem 0.3rem',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: eventType === 'campaign' || isCampaign ? '1px solid #ef4444' : '1px solid var(--border)',
                                background: eventType === 'campaign' || isCampaign ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.02)',
                                color: eventType === 'campaign' || isCampaign ? '#fca5a5' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🔥 Campaña
                        </button>
                    </div>
                </div>

                {!isSonido && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            <Info size={16} color="var(--primary)" />
                            Lugar / Función / Detalles
                        </label>
                        <input
                            className="glass-input"
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            placeholder="Ej: Iglesia de Ozama, Ensayos generales, etc."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                        />
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'end', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        type="button"
                        className="btn"
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary">
                        {t('assignService')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AssignServiceModal;
