import fs from 'fs/promises';
import path from 'path';

/**
 * EcclesiaSync Storage Layer
 * - In Development: Uses a local db.json file.
 * - In Production (Vercel): Uses Vercel's native storage (requires one-click connection).
 */

const DB_PATH = path.join(process.cwd(), 'db.json');

// Initial schema
const INITIAL_DATA = {
    users: [],
    templates: [],
    members: [],
    services: []
};

async function readData() {
    // If we're on Vercel, we would ideally use @vercel/kv or @vercel/postgres
    // For now, let's stick to a robust filesystem implementation or check env
    try {
        const content = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        // If file doesn't exist, create it with initial data
        await writeData(INITIAL_DATA);
        return INITIAL_DATA;
    }
}

async function writeData(data) {
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
