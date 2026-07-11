import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import { Calendar, Users, Flame, Info } from 'lucide-react';

const AssignServiceModal = ({ isOpen, onClose, members, onAssign }) => {
    const { t } = useLanguage();
    const [memberId, setMemberId] = useState('');
    const [serviceDate, setServiceDate] = useState('Lunes');
    const [serviceType, setServiceType] = useState('');
    const [isCampaign, setIsCampaign] = useState(false);

    const WEEKDAYS = [
        { value: 'Lunes', label: 'Lunes' },
        { value: 'Martes', label: 'Martes' },
        { value: 'Miércoles', label: 'Miércoles' },
        { value: 'Jueves', label: 'Jueves' },
        { value: 'Viernes', label: 'Viernes' },
        { value: 'Sábado', label: 'Sábado' },
        { value: 'Domingo', label: 'Domingo' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!memberId || !serviceDate) return;

        const selectedMember = members.find(m => m.id === memberId);
        const finalServiceType = isCampaign 
            ? (serviceType.trim() ? `Campaña - ${serviceType.trim()}` : 'Campaña') 
            : serviceType.trim();

        onAssign(memberId, selectedMember.name, serviceDate, finalServiceType);

        // Reset
        setMemberId('');
        setServiceDate('Lunes');
        setServiceType('');
        setIsCampaign(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('assignService') || 'Asignar Servicio'}>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Users size={16} color="var(--primary)" />
                        Seleccionar Miembro
                    </label>
                    <select
                        className="glass-input"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                    >
                        <option value="">-- Elige un miembro --</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.name} {member.number ? `(#${member.number})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Calendar size={16} color="var(--primary)" />
                        Día de Servicio (Semanal)
                    </label>
                    <select
                        className="glass-input"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                    >
                        {WEEKDAYS.map(day => (
                            <option key={day.value} value={day.value}>
                                {day.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Info size={16} color="var(--primary)" />
                        Tipo de Servicio / Función
                    </label>
                    <input
                        className="glass-input"
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        placeholder="Ej: Lector, Predicador, Acompañante"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px' }}
                    />
                </div>

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
