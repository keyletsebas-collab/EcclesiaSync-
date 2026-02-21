import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { StorageProvider } from './context/StorageContext'
import './index.css'



// Inner wrapper to pass accountId from AuthContext to StorageProvider
function AppWithStorage() {
  const { currentUser } = useAuth();
  return (
    <StorageProvider accountId={currentUser?.accountId}>
      <App />
    </StorageProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <AppWithStorage />
      </AuthProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
