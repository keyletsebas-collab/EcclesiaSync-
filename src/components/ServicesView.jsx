import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Trash2, UserPlus, ShieldAlert } from 'lucide-react';
import AssignServiceModal from './AssignServiceModal';

const ServicesView = ({ templateId, members }) => {
    const { services, addService, deleteService } = useStorage();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const templateServices = services
        .filter(s => s.templateId === templateId)
        .sort((a, b) => new Date(a.serviceDate) - new Date(b.serviceDate));

    const handleAssign = (memberId, memberName, serviceDate, serviceType) => {
        addService(templateId, memberId, memberName, serviceDate, serviceType);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                background: 'rgba(15, 23, 42, 0.3)',
                padding: '1.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={24} />
                        {t('servicesSchedule')}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {templateServices.length} {t('upcomingServices')}
                    </p>
                </div>

                {currentUser.isMaster && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsAssignModalOpen(true)}
                    >
                        <UserPlus size={18} />
                        {t('assignService')}
                    </button>
                )}
            </header>

            {/* Services List */}
            <div className="glass-panel">
                {templateServices.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: 'var(--text-muted)'
                    }}>
                        <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>{t('noServicesScheduled')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                        {templateServices.map(service => (
                            <div
                                key={service.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <Calendar size={16} color="var(--primary)" />
                                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                            {formatDate(service.serviceDate)}
                                        </span>
                                    </div>
                                    <div style={{ paddingLeft: '1.75rem' }}>
                                        <p style={{ margin: 0, color: 'var(--text-main)' }}>
                                            {t('assignedTo')}: <strong>{service.memberName}</strong>
                                        </p>
                                        {service.serviceType && (
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {service.serviceType}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {currentUser.isMaster ? (
                                    <button
                                        className="btn-danger"
                                        style={{ padding: '0.5rem', borderRadius: '6px' }}
                                        onClick={() => deleteService(service.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        title={t('onlyMasterCanDelete')}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '6px',
                                            background: 'rgba(100, 100, 100, 0.2)',
                                            border: '1px solid var(--border)',
                                            cursor: 'not-allowed',
                                            opacity: 0.5
                                        }}
                                    >
                                        <ShieldAlert size={16} color="var(--text-muted)" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AssignServiceModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                members={members}
                onAssign={handleAssign}
            />
        </div>
    );
};

export default ServicesView;
