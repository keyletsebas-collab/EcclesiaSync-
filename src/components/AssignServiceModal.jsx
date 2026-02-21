import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Modal from './Modal';
import { Calendar, Users } from 'lucide-react';

const AssignServiceModal = ({ isOpen, onClose, members, onAssign }) => {
    const { t } = useLanguage();
    const [memberId, setMemberId] = useState('');
    const [serviceDate, setServiceDate] = useState('');
    const [serviceType, setServiceType] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!memberId || !serviceDate) return;

        const selectedMember = members.find(m => m.id === memberId);
        onAssign(memberId, selectedMember.name, serviceDate, serviceType);

        // Reset
        setMemberId('');
        setServiceDate('');
        setServiceType('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('assignService')}>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <Users size={16} />
                        {t('selectMember')}
                    </label>
                    <select
                        className="glass-input"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        required
                    >
                        <option value="">{t('selectMember')}</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <Calendar size={16} />
                        {t('serviceDate')}
                    </label>
                    <input
                        className="glass-input"
                        type="date"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                        required
                    />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        {t('serviceType')}
                    </label>
                    <input
                        className="glass-input"
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        placeholder="e.g., Worship Leader, Usher"
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
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
