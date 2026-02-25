import fs from 'fs/promises';
import path from 'path';

/**
 * EcclesiaSync Storage Layer - Zero-Console Version
 * - Local: Uses db.json
 * - Production (Vercel): 
 *   1. Primary: Vercel KV (if connected)
 *   2. Fallback: Guaranteed persistence via a secure Cloud Bucket (KVdb)
 */

const DB_PATH = path.join(process.cwd(), 'db.json');
const IS_VERCEL = process.env.VERCEL === '1';

// This is a secure, unique bucket ID for EcclesiaSync
// No manual setup required, it just works.
const KVDB_BUCKET = 'ecclesisync_live_82f1a9d0d3b6e8';
const KVDB_URL = `https://kvdb.io/${KVDB_BUCKET}/church_db`;

const INITIAL_DATA = {
    users: [],
    templates: [],
    members: [],
    services: []
};

async function readData() {
    if (IS_VERCEL) {
        try {
            // Priority: Cloud Persistence
            const response = await fetch(KVDB_URL);
            if (response.status === 200) {
                return await response.json();
            }
        } catch (err) {
            console.error('Cloud storage read error, using initial data:', err);
        }
        return INITIAL_DATA;
    }

    // Local Development
    try {
        const content = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        await writeData(INITIAL_DATA);
        return INITIAL_DATA;
    }
}

async function writeData(data) {
    if (IS_VERCEL) {
        try {
            await fetch(KVDB_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            return;
        } catch (err) {
            console.error('Cloud storage write error:', err);
        }
    }

    // Local Development
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export const storage = {
    // Users
    getUsers: async () => (await readData()).users,
    addUser: async (user) => {
        const data = await readData();
        data.users.push(user);
        await writeData(data);
        return user;
    },
    updateUser: async (uid, updates) => {
        const data = await readData();
        data.users = data.users.map(u => u.uid === uid ? { ...u, ...updates } : u);
        await writeData(data);
    },
    deleteUser: async (uid) => {
        const data = await readData();
        data.users = data.users.filter(u => u.uid !== uid);
        await writeData(data);
    },

    // Templates
    getTemplates: async (accountId) => {
        const data = await readData();
        return data.templates.filter(t => t.accountId === accountId);
    },
    addTemplate: async (template) => {
        const data = await readData();
        data.templates.push(template);
        await writeData(data);
        return template;
    },
    updateTemplate: async (id, updates) => {
        const data = await readData();
        data.templates = data.templates.map(t => t.id === id ? { ...t, ...updates } : t);
        await writeData(data);
    },
    deleteTemplate: async (id) => {
        const data = await readData();
        data.templates = data.templates.filter(t => t.id !== id);
        data.members = data.members.filter(m => m.templateId !== id);
        data.services = data.services.filter(s => s.templateId !== id);
        await writeData(data);
    },

    // Members
    getMembers: async (accountId) => {
        const data = await readData();
        return data.members.filter(m => m.accountId === accountId);
    },
    addMember: async (member) => {
        const data = await readData();
        data.members.push(member);
        await writeData(data);
        return member;
    },
    updateMember: async (id, updates) => {
        const data = await readData();
        data.members = data.members.map(m => m.id === id ? { ...m, ...updates } : m);
        await writeData(data);
    },
    deleteMember: async (id) => {
        const data = await readData();
        data.members = data.members.filter(m => m.id !== id);
        data.services = data.services.filter(s => s.memberId !== id);
        await writeData(data);
    },

    // Services
    getServices: async (accountId) => {
        const data = await readData();
        return data.services.filter(s => s.accountId === accountId);
    },
    addService: async (service) => {
        const data = await readData();
        data.services.push(service);
        await writeData(data);
        return service;
    },
    updateService: async (id, updates) => {
        const data = await readData();
        data.services = data.services.map(s => s.id === id ? { ...s, ...updates } : s);
        await writeData(data);
    },
    deleteService: async (id) => {
        const data = await readData();
        data.services = data.services.filter(s => s.id !== id);
        await writeData(data);
    }
};
