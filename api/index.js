import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Environment Validation ──────────────────────────────────────────────────
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('❌ CRITICAL: Missing Airtable configuration');
}

const PORT = process.env.PORT || 3001;

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────

// Signup
app.post('/api/auth/signup', async (req, res) => {
    const { username: rawUsername, password, isMaster = false, accountId: joinedAccountId } = req.body;
    const username = rawUsername?.toLowerCase().trim();

    try {
        const users = await storage.getUsers();
        if (users.find(u => u.username?.toLowerCase() === username)) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }

        // Use joinedAccountId if provided, otherwise generate a new one
        const accountId = joinedAccountId 
            ? joinedAccountId.trim().toUpperCase() 
            : uuidv4().substring(0, 8).toUpperCase();
            
        const uid = uuidv4();
        const createdAt = new Date().toISOString();

        // New membership system: role can be master, editor, or viewer
        const memberships = [{
            id: accountId,
            role: !!isMaster ? 'master' : 'editor',
            expiresAt: null
        }];

        const newUser = { uid, username, password, isMaster: !!isMaster, accountId, createdAt, memberships };
        await storage.addUser(newUser);

        res.json({ success: true, accountId, username, isMaster: newUser.isMaster, uid, memberships });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { username: rawUsername, password } = req.body;
        const username = rawUsername?.toLowerCase().trim();
        
        console.log(`🔑 Login attempt for: ${username}`);
        const users = await storage.getUsers();
        
        const user = users.find(u => 
            u.username?.toLowerCase() === username && 
            u.password === password
        );

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, error: 'Account is blocked' });
        }
        res.json({ 
            success: true, 
            username: user.username, 
            isMaster: !!user.isMaster, 
            accountId: user.accountId, 
            uid: user.uid,
            memberships: user.memberships || []
        });
    } catch (err) {
        next(err);
    }
});

// Get all users (admin)
app.get('/api/auth/users', async (req, res) => {
    try {
        const users = await storage.getUsers();
        // Return all fields including password and isBlocked for master inspection
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user (role and/or block status)
app.put('/api/auth/users/:uid', async (req, res) => {
    const { uid } = req.params;
    const updates = {};
    if (req.body.isMaster !== undefined) updates.isMaster = !!req.body.isMaster;
    if (req.body.isBlocked !== undefined) updates.isBlocked = !!req.body.isBlocked;
    try {
        await storage.updateUser(uid, updates);
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

// ─── MEMBERSHIPS & PERMISSIONS ────────────────────────────────────────────────

/**
 * Check if a user has the required permission for a specific account.
 */
function checkPermission(user, accountId, requiredRole = 'editor') {
    if (!user || !user.memberships) return false;
    
    const membership = user.memberships.find(m => m.id === accountId);
    if (!membership) return false;

    // Check expiration if set
    if (membership.expiresAt && new Date(membership.expiresAt) < new Date()) {
        return false;
    }

    const rolesOrder = { 'master': 3, 'editor': 2, 'viewer': 1 };
    return (rolesOrder[membership.role] || 0) >= (rolesOrder[requiredRole] || 0);
}

// Join an existing account
app.post('/api/auth/accounts/join', async (req, res) => {
    const { uid, accountId } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const memberships = user.memberships || [];
        if (memberships.find(m => m.id === accountId)) {
            return res.status(400).json({ error: 'Already a member of this account' });
        }

        memberships.push({ id: accountId, role: 'editor', expiresAt: null });
        await storage.updateUser(uid, { memberships });
        res.json({ success: true, memberships });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Set role/expiration for a member (Master only)
app.post('/api/auth/accounts/role', async (req, res) => {
    const { masterUid, targetUid, accountId, role, expiresAt } = req.body;
    try {
        const users = await storage.getUsers();
        const masterUser = users.find(u => u.uid === masterUid);
        
        if (!checkPermission(masterUser, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master of this account can manage roles' });
        }

        const targetUser = users.find(u => u.uid === targetUid);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        const memberships = targetUser.memberships || [];
        const index = memberships.findIndex(m => m.id === accountId);
        
        const newMembership = { id: accountId, role, expiresAt: expiresAt || null };
        if (index >= 0) {
            memberships[index] = newMembership;
        } else {
            memberships.push(newMembership);
        }

        await storage.updateUser(targetUid, { memberships });
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
    const { accountId, name, customFields = [], uid } = req.body; // Expect uid for permission check
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can create templates' });
        }

        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const newTemplate = { id, accountId, name, customFields, createdAt };
        await storage.addTemplate(newTemplate);
        res.json(newTemplate);
    } catch (err) {
        console.error('Create template error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// Update template
app.put('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.body;
    try {
        const templates = await storage.getTemplates();
        const template = templates.find(t => t.id === id);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, template.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can update templates' });
        }

        await storage.updateTemplate(id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete template
app.delete('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.query; // Assume uid passed as query param for delete
    try {
        const templates = await storage.getTemplates();
        const template = templates.find(t => t.id === id);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, template.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can delete templates' });
        }

        await storage.deleteTemplate(id);
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
    const { templateId, accountId, name, number, phone, identifications = {}, uid } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can add members' });
        }

        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const newMember = { id, templateId, accountId, name, number, phone, identifications, createdAt };
        await storage.addMember(newMember);
        res.json(newMember);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update member
app.put('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.body;
    try {
        const members = await storage.getMembers();
        const member = members.find(m => m.id === id);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, member.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can update members' });
        }

        await storage.updateMember(id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.query;
    try {
        const members = await storage.getMembers();
        const member = members.find(m => m.id === id);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, member.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can delete members' });
        }

        await storage.deleteMember(id);
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
    const { templateId, memberId, accountId, memberName, serviceDate, serviceType = '', uid } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can assign services' });
        }

        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const newService = { id, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt };
        await storage.addService(newService);
        res.json(newService);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update service
app.put('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.body;
    try {
        const services = await storage.getServices();
        const service = services.find(s => s.id === id);
        if (!service) return res.status(404).json({ error: 'Service not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, service.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can update services' });
        }

        await storage.updateService(id, req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete service
app.delete('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.query;
    try {
        const services = await storage.getServices();
        const service = services.find(s => s.id === id);
        if (!service) return res.status(404).json({ error: 'Service not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, service.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can delete services' });
        }

        await storage.deleteService(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('🔴 Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'LuminaSync Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ LuminaSync API running on http://localhost:${PORT}`);
});

export default app;
