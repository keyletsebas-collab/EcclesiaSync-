import React, { createContext, useContext, useState, useEffect } from 'react';

const StorageContext = createContext();

const API_URL = '';

export const useStorage = () => {
    return useContext(StorageContext);
};

export const StorageProvider = ({ children, accountId }) => {
    const [templates, setTemplates] = useState([]);
    const [members, setMembers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const [tRes, mRes, sRes] = await Promise.all([
                fetch(`${API_URL}/api/templates?accountId=${accountId}`),
                fetch(`${API_URL}/api/members?accountId=${accountId}`),
                fetch(`${API_URL}/api/services?accountId=${accountId}`)
            ]);

            const [tData, mData, sData] = await Promise.all([
                tRes.json(), mRes.json(), sRes.json()
            ]);

            if (Array.isArray(tData)) setTemplates(tData);
            if (Array.isArray(mData)) setMembers(mData);
            if (Array.isArray(sData)) setServices(sData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [accountId]);

    // ── Template Actions ──────────────────────────────────────────────────────

    const addTemplate = async (name, customFields = []) => {
        try {
            await fetch(`${API_URL}/api/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, name, customFields })
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to add template:', err);
        }
    };

    const updateTemplate = async (id, updatedData) => {
        try {
            await fetch(`${API_URL}/api/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to update template:', err);
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await fetch(`${API_URL}/api/templates/${id}`, { method: 'DELETE' });
            await fetchData();
        } catch (err) {
            console.error('Failed to delete template:', err);
        }
    };

    // ── Member Actions ────────────────────────────────────────────────────────

    const addMember = async (templateId, memberData) => {
        try {
            await fetch(`${API_URL}/api/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId, accountId, ...memberData })
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to add member:', err);
        }
    };

    const updateMember = async (id, updatedData) => {
        try {
            await fetch(`${API_URL}/api/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to update member:', err);
        }
    };

    const deleteMember = async (id) => {
        try {
            await fetch(`${API_URL}/api/members/${id}`, { method: 'DELETE' });
            await fetchData();
        } catch (err) {
            console.error('Failed to delete member:', err);
        }
    };

    // ── Service Actions ───────────────────────────────────────────────────────

    const addService = async (templateId, memberId, memberName, serviceDate, serviceType = '') => {
        try {
            await fetch(`${API_URL}/api/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId, memberId, accountId, memberName, serviceDate, serviceType })
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to add service:', err);
        }
    };

    const updateService = async (id, updatedData) => {
        try {
            await fetch(`${API_URL}/api/services/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to update service:', err);
        }
    };

    const deleteService = async (id) => {
        try {
            await fetch(`${API_URL}/api/services/${id}`, { method: 'DELETE' });
            await fetchData();
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
        deleteService,
        refreshData: fetchData
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
};
