import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import { useStorage } from './context/StorageContext';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Plus, Sparkles, Menu, ChevronRight } from 'lucide-react';
import Modal from './components/Modal';
import LandingPage from './components/LandingPage';
import TemplateView from './components/TemplateView';
import AdminsView from './components/AdminsView';
import HistoryView from './components/HistoryView';
import DashboardView from './components/DashboardView';

import notificationService from './utils/NotificationService';

function App() {
  const { isAuthenticated, currentUser, users } = useAuth();
  const { addTemplate, templates, members, addMember } = useStorage();
  const { t } = useLanguage();
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [activeView, setActiveView] = useState('history'); // 'history', 'templates' or 'admins'
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);



  // Reset active view and template when current user changes (e.g. login/logout)
  useEffect(() => {
    setActiveTemplateId(null);
    setActiveView('history');
  }, [currentUser?.uid]);

  // New Template Form State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFields, setNewTemplateFields] = useState(['']);
  const [newTemplateType, setNewTemplateType] = useState('diaconos');
  const [newTemplatePassword, setNewTemplatePassword] = useState('');

  // Password Prompt States
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [templatePasswordPrompt, setTemplatePasswordPrompt] = useState('');
  const [enteredTemplatePassword, setEnteredTemplatePassword] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');

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
    if (newTemplatePassword.trim()) {
      fields.push(`__password:${newTemplatePassword.trim()}`);
    }
    try {
      await addTemplate(newTemplateName, fields);
      // Reset and close
      setNewTemplateName('');
      setNewTemplateFields(['']);
      setNewTemplateType('diaconos');
      setNewTemplatePassword('');
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

  const handleSelectTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const isMaster = currentUser?.isMaster || false;
    const activeMembership = currentUser?.memberships?.find(m => m.id === template.accountId);
    const currentUserFullName = activeMembership?.fullName || currentUser?.username || '';

    const templateMembers = members.filter(m => m.templateId === templateId);
    const isMember = templateMembers.some(m => m.name?.toLowerCase().trim() === currentUserFullName.toLowerCase().trim());

    if (isMaster || isMember) {
      setActiveTemplateId(templateId);
      setActiveView('templates');
      setIsMobileSidebarOpen(false);
      return;
    }

    const pwdField = template.customFields?.find(f => f.startsWith('__password:'));
    if (!pwdField) {
      // Just select and open the template view
      setActiveTemplateId(templateId);
      setActiveView('templates');
      setIsMobileSidebarOpen(false);
      return;
    }

    const correctPassword = pwdField.replace('__password:', '');
    setPendingTemplateId(templateId);
    setTemplatePasswordPrompt(correctPassword);
    setEnteredTemplatePassword('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (enteredTemplatePassword.trim() === templatePasswordPrompt.trim()) {
      const template = templates.find(t => t.id === pendingTemplateId);
      const activeMembership = currentUser?.memberships?.find(m => m.id === template?.accountId);
      const currentUserFullName = activeMembership?.fullName || currentUser?.username || '';
      const activePhone = activeMembership?.phone || '';
      const templateMembers = members.filter(m => m.templateId === pendingTemplateId);

      try {
        const maxNumber = templateMembers.reduce((max, m) => (m.number > max ? m.number : max), 0);
        const nextNumber = maxNumber + 1;
        const isPoetry = template?.customFields?.includes('__poetry__');
        const isSonido = template?.customFields?.includes('__sonido__');
        const identifications = isPoetry
          ? { isParticipant: true }
          : isSonido
            ? { hasKey: false }
            : {
                familyRole: '',
                familyName: '',
                hasKey: false,
                needsPrayer: false
              };
        await addMember(pendingTemplateId, {
          name: currentUserFullName,
          number: nextNumber,
          phone: activePhone,
          identifications
        });
      } catch (err) {
        console.error('Error joining template:', err);
      }

      setActiveTemplateId(pendingTemplateId);
      setActiveView('templates');
      setIsMobileSidebarOpen(false);
      setIsPasswordModalOpen(false);
      setEnteredTemplatePassword('');
      setPasswordError('');
      setPendingTemplateId(null);
      setTemplatePasswordPrompt('');
    } else {
      setPasswordError('Contraseña incorrecta. Por favor, inténtalo de nuevo.');
    }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }} />
          <span className="mobile-logo">VerbumSync</span>
        </div>
        <div style={{ width: 24 }}></div> {/* spacer */}
      </header>

      {/* Sidebar Backdrop on Mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}


      <Sidebar
        activeTemplate={activeTemplateId}
        onSelectTemplate={handleSelectTemplate}
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {isSidebarCollapsed && (
        <button 
          onClick={() => setIsSidebarCollapsed(false)}
          className="desktop-sidebar-toggle-btn"
          style={{
            position: 'fixed',
            left: '1.5rem',
            top: '1.5rem',
            zIndex: 999,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            color: 'var(--text-main)',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'background 0.2s, transform 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--bg-glass)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Mostrar barra lateral"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <main className="main-content">
        {activeView === 'admins' && currentUser?.username?.toLowerCase() === 'keylet' ? (
          <AdminsView />
        ) : activeView === 'history' ? (
          <DashboardView
            onSelectTemplate={handleSelectTemplate}
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
            onSelectTemplate={handleSelectTemplate}
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

          {/* Password Protection Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Contraseña de Acceso (Opcional)</label>
            <input
              type="password"
              className="glass-input"
              value={newTemplatePassword}
              onChange={(e) => setNewTemplatePassword(e.target.value)}
              placeholder="Ej. miClave123"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Si se establece, los usuarios que no pertenezcan a la plantilla deberán ingresarla para poder acceder.
            </span>
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

      {/* Password Prompt Modal for Restricted Template Access */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setEnteredTemplatePassword('');
          setPasswordError('');
          setPendingTemplateId(null);
          setTemplatePasswordPrompt('');
        }}
        title="Acceso Restringido"
      >
        <form onSubmit={handlePasswordSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
              No eres miembro de esta plantilla. Para poder unirte y acceder a sus datos, por favor ingresa la contraseña correspondiente:
            </p>
            <input
              type="password"
              className="glass-input"
              value={enteredTemplatePassword}
              onChange={(e) => setEnteredTemplatePassword(e.target.value)}
              placeholder="Contraseña de la plantilla"
              autoFocus
              style={{ width: '100%' }}
            />
            {passwordError && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-danger)', marginTop: '0.5rem', display: 'block', fontWeight: 500 }}>
                ⚠️ {passwordError}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              className="btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onClick={() => {
                setIsPasswordModalOpen(false);
                setEnteredTemplatePassword('');
                setPasswordError('');
                setPendingTemplateId(null);
                setTemplatePasswordPrompt('');
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Entrar y Unirse
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
