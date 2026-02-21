import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useLanguage } from '../context/LanguageContext';
import { Users, FolderPlus, FileText, Settings as SettingsIcon, ChevronRight, BookOpen } from 'lucide-react';
import Settings from './Settings';

const Sidebar = ({ activeTemplate, onSelectTemplate, onOpenNewTemplate, onInstallApp, canInstall }) => {
    const { templates } = useStorage();
    const { t } = useLanguage();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <aside className="sidebar">
                {/* ... existing sidebar content ... */}
                {/* (Showing only the bottom part for brevity in targetContent, but I will replace the whole component definition signature) */}
            </aside>

            <Settings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onInstallApp={onInstallApp}
                canInstall={canInstall}
            />
        </>
    );
};

export default Sidebar;
