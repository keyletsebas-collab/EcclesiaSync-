import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { Trash2 } from 'lucide-react';

const ProgramsView = ({ templateId, accountId, isTemplateEditor }) => {
    const { programs, addProgram, deleteProgram } = useStorage();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const templatePrograms = (programs || []).filter(p => p.templateId === templateId);

    const filteredPrograms = templatePrograms.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        await addProgram(templateId, { title: title.trim(), content: content.trim() });
        setTitle('');
        setContent('');
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    className="glass-input"
                    placeholder="🔍 Buscar programas..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start' }}>
                {isTemplateEditor && (
                    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                        <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>
                            ✍️ Crear Nuevo Programa
                        </h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Título del Programa</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Ej: Culto de Jóvenes, Programa Campaña de Agosto"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Detalle/Pasos del Programa</label>
                                <textarea
                                    className="glass-input"
                                    placeholder="Escribe el orden del servicio o actividades paso a paso..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    rows={8}
                                    required
                                    style={{ fontFamily: 'monospace', lineHeight: '1.5', fontSize: '0.9rem' }}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '0.6rem 1.5rem' }}>
                                Guardar Programa
                            </button>
                        </form>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📋 Programas Guardados ({filteredPrograms.length})
                    </h3>
                    {filteredPrograms.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No hay programas registrados
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                            {filteredPrograms.map(prog => (
                                <div key={prog.id} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{prog.title}</h4>
                                        {isTemplateEditor && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Seguro que deseas eliminar este programa?')) {
                                                        deleteProgram(prog.id);
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <pre style={{
                                        margin: 0,
                                        padding: '0.75rem',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        color: '#cbd5e1',
                                        fontFamily: 'var(--font-mono)',
                                        whiteSpace: 'pre-wrap',
                                        overflowX: 'auto',
                                        maxHeight: '200px',
                                        overflowY: 'auto'
                                    }}>
                                        {prog.content}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgramsView;
