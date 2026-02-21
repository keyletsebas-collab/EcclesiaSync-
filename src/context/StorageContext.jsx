import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const StorageContext = createContext();
const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

export const useStorage = () => {
    return useContext(StorageContext);
};

export const StorageProvider = ({ children, accountId }) => {
    const [templates, setTemplates] = useState([]);
    const [members, setMembers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load all data
    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, mRes, sRes] = await Promise.all([
                fetch(`${API}/templates`),
                fetch(`${API}/members`),
                fetch(`${API}/services`)
            ]);
            const [t, m, s] = await Promise.all([tRes.json(), mRes.json(), sRes.json()]);
            setTemplates(Array.isArray(t) ? t : []);
            setMembers(Array.isArray(m) ? m : []);
            setServices(Array.isArray(s) ? s : []);
        } catch (err) {
            console.error('StorageContext Error - Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // ── Template Actions ──────────────────────────────────────────────────────

    const addTemplate = async (name, customFields = []) => {
        try {
            const res = await fetch(`${API}/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, name, customFields })
            });
            const newTemplate = await res.json();
            setTemplates(prev => [...prev, newTemplate]);
        } catch (err) {
            console.error('Failed to add template:', err);
        }
    };

    const updateTemplate = async (id, updatedData) => {
        try {
            await fetch(`${API}/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
        } catch (err) {
            console.error('Failed to update template:', err);
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await fetch(`${API}/templates/${id}`, { method: 'DELETE' });
            setTemplates(prev => prev.filter(t => t.id !== id));
            setMembers(prev => prev.filter(m => m.templateId !== id));
            setServices(prev => prev.filter(s => s.templateId !== id));
        } catch (err) {
            console.error('Failed to delete template:', err);
        }
    };

    // ── Member Actions ────────────────────────────────────────────────────────

    const addMember = async (templateId, memberData) => {
        try {
            const res = await fetch(`${API}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId, accountId, ...memberData })
            });
            const newMember = await res.json();
            setMembers(prev => [...prev, newMember]);
        } catch (err) {
            console.error('Failed to add member:', err);
        }
    };

    const updateMember = async (id, updatedData) => {
        try {
            await fetch(`${API}/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedData } : m));
        } catch (err) {
            console.error('Failed to update member:', err);
        }
    };

    const deleteMember = async (id) => {
        try {
            await fetch(`${API}/members/${id}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(m => m.id !== id));
            setServices(prev => prev.filter(s => s.memberId !== id));
        } catch (err) {
            console.error('Failed to delete member:', err);
        }
    };

    // ── Service Actions ───────────────────────────────────────────────────────

    const addService = async (templateId, memberId, memberName, serviceDate, serviceType = '') => {
        try {
            const res = await fetch(`${API}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId, memberId, accountId, memberName, serviceDate, serviceType })
            });
            const newService = await res.json();
            setServices(prev => [...prev, newService]);
        } catch (err) {
            console.error('Failed to add service:', err);
        }
    };

    const updateService = async (id, updatedData) => {
        try {
            await fetch(`${API}/services/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            setServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
        } catch (err) {
            console.error('Failed to update service:', err);
        }
    };

    const deleteService = async (id) => {
        try {
            await fetch(`${API}/services/${id}`, { method: 'DELETE' });
            setServices(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error('Failed to delete service:', err);
        }
    };

    const value = {
        templates,
        members,
        services,
        loading,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        addMember,
        updateMember,
        deleteMember,
        addService,
        updateService,
        deleteService
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
};
