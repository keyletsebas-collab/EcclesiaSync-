import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import { useStorage } from './context/StorageContext';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Plus, Sparkles, Menu } from 'lucide-react';
import Modal from './components/Modal';
import LandingPage from './components/LandingPage';
import TemplateView from './components/TemplateView';
import AdminsView from './components/AdminsView';
import HistoryView from './components/HistoryView';
import DashboardView from './components/DashboardView';

function App() {
  const { isAuthenticated } = useAuth();
  const { addTemplate } = useStorage();
  const { t } = useLanguage();
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [activeView, setActiveView] = useState('history'); // 'history', 'templates' or 'admins'
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // New Template Form State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFields, setNewTemplateFields] = useState(['']);
  const [newTemplateType, setNewTemplateType] = useState('diaconos');



  // Show Portada if not authenticated and showLanding is true
  if (!isAuthenticated && showLanding) {
    return <LandingPage onEnter={() => {
      setShowLanding(false);
    }} />;
  }

  // Show Auth screen if not authenticated
  if (!isAuthenticated) {
    return <Auth />;
  }

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    let fields = [];
    if (newTemplateType === 'poesia') {
      fields = ['__poetry__'];
    } else if (newTemplateType === 'sonido') {
      fields = ['__sonido__'];
    } else {
      fields = newTemplateFields.filter(f => f.trim() !== '');
    }
    try {
      await addTemplate(newTemplateName, fields);
      // Reset and close
      setNewTemplateName('');
      setNewTemplateFields(['']);
      setNewTemplateType('diaconos');
      setIsNewTemplateModalOpen(false);
    } catch (err) {
      alert(`No se pudo crear la plantilla: ${err.message}`);
    }
  };

  const handleAddField = () => {
    setNewTemplateFields([...newTemplateFields, '']);
  };

  const handleFieldChange = (index, value) => {
    const newFields = [...newTemplateFields];
    newFields[index] = value;
    setNewTemplateFields(newFields);
  };


  return (
    <div className="app-container">
      <div className="blob-container">
        <div className="blob"></div>
        <div className="blob"></div>
        <div className="blob"></div>
      </div>

      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="mobile-menu-btn">
          <Menu size={24} />
        </button>
        <span className="mobile-logo">VerbumSync</span>
        <div style={{ width: 24 }}></div> {/* spacer */}
      </header>

      {/* Sidebar Backdrop on Mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Version Indicator */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '24px',
        zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.4)',
        backdropFilter: 'blur(12px)',
        padding: '6px 12px',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--primary)',
        border: '1px solid var(--border)',
        letterSpacing: '0.05em',
        pointerEvents: 'none'
      }}>
        VerbumSync CORE v3.0
      </div>

      <Sidebar
        activeTemplate={activeTemplateId}
        onSelectTemplate={(id) => {
          setActiveTemplateId(id);
          setActiveView('templates');
          setIsMobileSidebarOpen(false);
        }}
        onOpenNewTemplate={() => {
          setIsNewTemplateModalOpen(true);
          setIsMobileSidebarOpen(false);
        }}
        activeView={activeView}
        onSelectAdmins={() => {
          setActiveTemplateId(null);
          setActiveView('admins');
          setIsMobileSidebarOpen(false);
        }}
        onSelectHistory={() => {
          setActiveTemplateId(null);
          setActiveView('history');
          setIsMobileSidebarOpen(false);
        }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <main className="main-content">
        {activeView === 'admins' ? (
          <AdminsView />
        ) : activeView === 'history' ? (
          <DashboardView
            onSelectTemplate={(id) => {
              setActiveTemplateId(id);
              setActiveView('templates');
              setIsMobileSidebarOpen(false);
            }}
            onSelectAdmins={() => {
              setActiveTemplateId(null);
              setActiveView('admins');
              setIsMobileSidebarOpen(false);
            }}
            onSelectHistory={() => {
              setActiveTemplateId(null);
              setActiveView('history');
              setIsMobileSidebarOpen(false);
            }}
            onOpenNewTemplate={() => {
              setIsNewTemplateModalOpen(true);
              setIsMobileSidebarOpen(false);
            }}
          />
        ) : activeTemplateId ? (
          <TemplateView templateId={activeTemplateId} onDeleted={() => setActiveTemplateId(null)} />
        ) : (
          <DashboardView
            onSelectTemplate={(id) => {
              setActiveTemplateId(id);
              setActiveView('templates');
              setIsMobileSidebarOpen(false);
            }}
            onSelectAdmins={() => {
              setActiveTemplateId(null);
              setActiveView('admins');
              setIsMobileSidebarOpen(false);
            }}
            onSelectHistory={() => {
              setActiveTemplateId(null);
              setActiveView('history');
              setIsMobileSidebarOpen(false);
            }}
            onOpenNewTemplate={() => {
              setIsNewTemplateModalOpen(true);
              setIsMobileSidebarOpen(false);
            }}
          />
        )}
      </main>

      <Modal
        isOpen={isNewTemplateModalOpen}
        onClose={() => setIsNewTemplateModalOpen(false)}
        title={t('createNewTemplate')}
      >
        <form onSubmit={handleCreateTemplate}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Plantilla</label>
            <select
              className="glass-input"
              value={newTemplateType}
              onChange={(e) => setNewTemplateType(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
            >
              <option value="diaconos">🏛️ Diáconos (Estándar)</option>
              <option value="poesia">📖 Poesía (Biblioteca y Digitalización)</option>
              <option value="sonido">🔊 Sonido (Miembros y Servicios)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{t('templateName')}</label>
            <input
              className="glass-input"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder={t('templateNamePlaceholder')}
              autoFocus
            />
          </div>

          {newTemplateType === 'diaconos' ? (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                {t('customFields')} <span style={{ color: 'var(--text-muted)' }}>{t('optional')}</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {newTemplateFields.map((field, index) => (
                  <input
                    key={index}
                    className="glass-input"
                    value={field}
                    onChange={(e) => handleFieldChange(index, e.target.value)}
                    placeholder={t('fieldPlaceholder').replace('{n}', index + 1)}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleAddField}
                  style={{
                    background: 'none',
                    border: '1px dashed var(--border)',
                    color: 'var(--text-muted)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {t('addField')}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginBottom: '1rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              lineHeight: '1.4'
            }}>
              ✨ <strong>Plantilla de Poesía:</strong> Esta plantilla incluye automáticamente una biblioteca digital, visualización de versos y estrofas con fuentes premium, y digitalización de fotos o documentos mediante Inteligencia Artificial (Google Gemini OCR).
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onClick={() => setIsNewTemplateModalOpen(false)}
            >
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('createTemplate')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
