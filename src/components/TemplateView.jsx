import React from 'react';
import { useStorage } from '../context/StorageContext';
import PoetryTemplateView from './poetry/PoetryTemplateView';
import SonidoTemplateView from './sonido/SonidoTemplateView';
import DiaconosTemplateView from './diaconos/DiaconosTemplateView';

const TemplateView = ({ templateId, onDeleted }) => {
    const { templates } = useStorage();

    const template = templates.find(t => t.id === templateId);

    if (!template) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Plantilla no encontrada.
            </div>
        );
    }

    const isPoetry = template.customFields?.includes('__poetry__');
    const isSonido = template.customFields?.includes('__sonido__');

    if (isPoetry) {
        return <PoetryTemplateView templateId={templateId} onDeleted={onDeleted} />;
    }

    if (isSonido) {
        return <SonidoTemplateView templateId={templateId} onDeleted={onDeleted} />;
    }

    return <DiaconosTemplateView templateId={templateId} onDeleted={onDeleted} />;
};

export default TemplateView;
