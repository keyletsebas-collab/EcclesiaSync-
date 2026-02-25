import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────

// Signup
app.post('/api/auth/signup', async (req, res) => {
    const { username, password, isMaster = false } = req.body;
    try {
        const users = await storage.getUsers();
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        const accountId = uuidv4().substring(0, 8).toUpperCase();
        const uid = uuidv4();
        const createdAt = new Date().toISOString();

        const newUser = { uid, username, password, isMaster: !!isMaster, accountId, createdAt };
        await storage.addUser(newUser);

        res.json({ success: true, accountId, username, isMaster: newUser.isMaster, uid });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        res.json({ success: true, username: user.username, isMaster: !!user.isMaster, accountId: user.accountId, uid: user.uid });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get all users (admin)
app.get('/api/auth/users', async (req, res) => {
    try {
        const users = await storage.getUsers();
        res.json(users.map(({ password, ...u }) => u));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user role
app.put('/api/auth/users/:uid', async (req, res) => {
    const { uid } = req.params;
    const { isMaster } = req.body;
    try {
        await storage.updateUser(uid, { isMaster: !!isMaster });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete user
app.delete('/api/auth/users/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        await storage.deleteUser(uid);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

// Get all templates (for an account)
app.get('/api/templates', async (req, res) => {
    const { accountId } = req.query;
    try {
        const templates = await storage.getTemplates(accountId);
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create template
app.post('/api/templates', async (req, res) => {
    const { accountId, name, customFields = [] } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    try {
        const newTemplate = { id, accountId, name, customFields, createdAt };
        await storage.addTemplate(newTemplate);
        res.json(newTemplate);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update template
app.put('/api/templates/:id', async (req, res) => {
    try {
        await storage.updateTemplate(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete template
app.delete('/api/templates/:id', async (req, res) => {
    try {
        await storage.deleteTemplate(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── MEMBERS ──────────────────────────────────────────────────────────────────

// Get members
app.get('/api/members', async (req, res) => {
    const { accountId } = req.query;
    try {
        const members = await storage.getMembers(accountId);
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create member
app.post('/api/members', async (req, res) => {
    const { templateId, accountId, name, number, phone, identifications = {} } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    try {
        const newMember = { id, templateId, accountId, name, number, phone, identifications, createdAt };
        await storage.addMember(newMember);
        res.json(newMember);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update member
app.put('/api/members/:id', async (req, res) => {
    try {
        await storage.updateMember(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
    try {
        await storage.deleteMember(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── SERVICES ─────────────────────────────────────────────────────────────────

// Get services
app.get('/api/services', async (req, res) => {
    const { accountId } = req.query;
    try {
        const services = await storage.getServices(accountId);
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create service
app.post('/api/services', async (req, res) => {
    const { templateId, memberId, accountId, memberName, serviceDate, serviceType = '' } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    try {
        const newService = { id, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt };
        await storage.addService(newService);
        res.json(newService);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update service
app.put('/api/services/:id', async (req, res) => {
    try {
        await storage.updateService(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete service
app.delete('/api/services/:id', async (req, res) => {
    try {
        await storage.deleteService(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ EcclesiaSync API running on http://localhost:${PORT}`);
        console.log(`📂 Using Local JSON storage at db.json`);
    });
}

export default app;
