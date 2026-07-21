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
    const [selectedPoemId, setSelectedPoemId] = useState('');
    const [isCampaign, setIsCampaign] = useState(false);

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
        const finalServiceType = isCampaign 
            ? (serviceType.trim() ? `Campaña - ${serviceType.trim()}` : 'Campaña') 
            : serviceType.trim();

        const selectedProgram = templatePrograms.find(p => p.id === selectedProgramId);
        let programText = selectedProgram ? `=== ${selectedProgram.title} ===\n${selectedProgram.content}` : '';

        if (isPoetry && selectedPoemId) {
            const poem = poems.find(p => p.id === selectedPoemId);
            if (poem) {
                programText = `📖 Poesía: ${poem.name}\n-----------------------\n${poem.identifications?.content || ''}\n\n${programText}`;
            }
        }

        onAssign(primaryMember.id, primaryMember.name, serviceDate, finalServiceType, selectedMembers, programText);

        // Reset
        setSelectedMemberIds([]);
        setServiceDate(new Date().toISOString().split('T')[0]);
        setServiceType('');
        setSelectedProgramId('');
        setSelectedPoemId('');
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
                            📝 Seleccionar Poesía a Recitar (Opcional)
                        </label>
                        <select
                            className="glass-input"
                            value={selectedPoemId}
                            onChange={(e) => setSelectedPoemId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                        >
                            <option value="">-- Ninguna --</option>
                            {poems.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

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

                <div style={{
                    marginBottom: '1.5rem',
                    padding: '0.85rem',
                    background: isCampaign ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px',
                    border: isCampaign ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                    transition: 'all 0.3s ease'
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={isCampaign}
                            onChange={(e) => setIsCampaign(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: isCampaign ? '#fca5a5' : 'var(--text-main)' }}>
                                <Flame size={16} /> ¿Hay campaña este día?
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                                Si se activa, este día se mostrará resaltado con un efecto especial de fuego/color.
                            </span>
                        </div>
                    </label>
                </div>

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
