import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import { useStorage } from './context/StorageContext';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Plus, BookOpen } from 'lucide-react';
import Modal from './components/Modal';
import LandingPage from './components/LandingPage';
import TemplateView from './components/TemplateView';

function App() {
  const { isAuthenticated } = useAuth();
  const { addTemplate } = useStorage();
  const { t } = useLanguage();
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // New Template Form State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFields, setNewTemplateFields] = useState(['']);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

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

    const fields = newTemplateFields.filter(f => f.trim() !== '');
    await addTemplate(newTemplateName, fields);

    // Reset and close
    setNewTemplateName('');
    setNewTemplateFields(['']);
    setIsNewTemplateModalOpen(false);
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
      {/* Version Indicator */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '2px 8px',
        borderRadius: '100px',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none',
        fontFamily: 'monospace'
      }}>
        EcclesiaSync v2.0.2
      </div>

      <Sidebar
        activeTemplate={activeTemplateId}
        onSelectTemplate={setActiveTemplateId}
        onOpenNewTemplate={() => setIsNewTemplateModalOpen(true)}
        onInstallApp={handleInstallClick}
        canInstall={!!deferredPrompt}
      />

      <main className="main-content">
        {activeTemplateId ? (
          <TemplateView templateId={activeTemplateId} />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.1) 100%)',
              padding: '3rem',
              borderRadius: '50%',
              marginBottom: '2rem',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={64} style={{ color: 'var(--primary)', opacity: 0.8 }} />
            </div>
            <h1>{t('welcomeTitle')}</h1>
            <p style={{ maxWidth: '400px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              {t('welcomeMessage')}
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '2rem' }}
              onClick={() => setIsNewTemplateModalOpen(true)}
            >
              <Plus size={18} />
              {t('createFirstTemplate')}
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={isNewTemplateModalOpen}
        onClose={() => setIsNewTemplateModalOpen(false)}
        title={t('createNewTemplate')}
      >
        <form onSubmit={handleCreateTemplate}>
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
