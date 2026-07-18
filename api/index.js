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
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration');
}

const PORT = process.env.PORT || 3001;

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        geminiApiKey: process.env.GEMINI_API_KEY || ''
    });
});

// Auto join all templates of an account for a user using their name
async function autoJoinTemplates(accountId, name, phone) {
    if (!name || !name.trim()) return;
    try {
        const templates = await storage.getTemplates();
        const accountTemplates = templates.filter(t => t.accountId === accountId);
        const members = await storage.getMembers();
        
        for (const template of accountTemplates) {
            const templateMembers = members.filter(m => m.templateId === template.id);
            const exists = templateMembers.some(m => m.name?.toLowerCase().trim() === name.toLowerCase().trim());
            if (!exists) {
                const maxNumber = templateMembers.reduce((max, m) => (m.number > max ? m.number : max), 0);
                const nextNumber = maxNumber + 1;
                
                const newMember = {
                    id: uuidv4(),
                    templateId: template.id,
                    accountId: accountId,
                    name: name.trim(),
                    number: nextNumber,
                    phone: phone?.trim() || '',
                    identifications: {
                        familyRole: '',
                        familyName: '',
                        hasKey: false,
                        needsPrayer: false
                    },
                    createdAt: new Date().toISOString()
                };
                await storage.addMember(newMember);
                console.log(`Auto-joined member ${name} to template ${template.name}`);
            }
        }
    } catch (err) {
        console.error('Failed to auto join templates:', err);
    }
}

async function checkIfSonido(templateId, accountId) {
    try {
        const templates = await storage.getTemplates();
        if (templateId) {
            const template = templates.find(t => t.id === templateId);
            return !!template?.customFields?.includes('__sonido__');
        }
        if (accountId) {
            const accountTemplates = templates.filter(t => t.accountId === accountId);
            return accountTemplates.some(t => t.customFields?.includes('__sonido__'));
        }
    } catch (e) {
        console.error('checkIfSonido error:', e);
    }
    return false;
}

// Middleware to verify if the requester is the main admin 'keylet' or has at least 'viewer' permission in the account
async function checkIsKeylet(req, res, next) {
    const userUid = req.headers['x-user-uid'] || req.query.uid || req.body?.uid;
    const accountId = req.query.accountId || req.body?.accountId;
    const templateId = req.query.templateId || req.body?.templateId;

    if (await checkIfSonido(templateId, accountId)) {
        return next();
    }

    if (!userUid) {
        return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
    }
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === userUid);
        if (!user) {
            return res.status(403).json({ error: 'Access denied: Usuario no encontrado' });
        }

        // Allow main admin 'keylet' unconditionally
        if (user.username?.toLowerCase() === 'keylet') {
            req.currentUser = user;
            return next();
        }

        // Check if user has membership in the account
        let finalAccountId = accountId;
        if (!finalAccountId && templateId) {
            const templates = await storage.getTemplates();
            const template = templates.find(t => t.id === templateId);
            if (template) {
                finalAccountId = template.accountId;
            }
        }

        if (!finalAccountId) {
            // Fallback: check if the user has memberships at all
            if (user.memberships && user.memberships.length > 0) {
                req.currentUser = user;
                return next();
            }
            return res.status(403).json({ error: 'Access denied: No tienes acceso a esta cuenta' });
        }

        if (!checkPermission(user, finalAccountId, 'viewer')) {
            return res.status(403).json({ error: 'Access denied: Restringido al administrador principal o miembros autorizados' });
        }

        req.currentUser = user;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Internal validation error' });
    }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

// Signup
app.post('/api/auth/signup', async (req, res) => {
    const { username: rawUsername, password, isMaster = false, accountId: joinedAccountId, fullName = '', phone = '', email = '' } = req.body;
    const username = (email || rawUsername)?.toLowerCase().trim();

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
            expiresAt: null,
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: username
        }];

        const newUser = { uid, username, password, isMaster: !!isMaster, accountId, createdAt, memberships };
        await storage.addUser(newUser);

        // Auto join all templates of this account with the new user's name
        await autoJoinTemplates(accountId, fullName || username, phone);

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
app.get('/api/auth/users', checkIsKeylet, async (req, res) => {
    try {
        const users = await storage.getUsers();
        // Return all fields including password and isBlocked for master inspection
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single user details (e.g. on reload)
app.get('/api/auth/users/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user (role and/or block status)
app.put('/api/auth/users/:uid', checkIsKeylet, async (req, res) => {
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

// Update own profile (birthday, address)
app.put('/api/auth/profile', async (req, res) => {
    const { uid, birthday, address } = req.body;
    if (!uid) {
        return res.status(400).json({ error: 'Missing user UID' });
    }
    try {
        const updates = {};
        if (birthday !== undefined) updates.birthday = birthday;
        if (address !== undefined) updates.address = address;
        await storage.updateUser(uid, updates);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Delete user
app.delete('/api/auth/users/:uid', checkIsKeylet, async (req, res) => {
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

        const profile = memberships.find(m => m.fullName) || {};
        const name = profile.fullName || user.username;
        const phone = profile.phone || '';

        memberships.push({ 
            id: accountId, 
            role: 'editor', 
            expiresAt: null,
            fullName: name,
            phone: phone,
            email: user.username
        });
        await storage.updateUser(uid, { memberships });

        // Auto join all templates of this account with the user's name
        await autoJoinTemplates(accountId, name, phone);

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
        
        const oldMembership = index >= 0 ? memberships[index] : {};
        const newMembership = { 
            ...oldMembership,
            id: accountId, 
            role, 
            expiresAt: expiresAt || null 
        };
        
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
    console.log(`📂 Fetching templates for account: ${accountId}`);
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
app.get('/api/members', checkIsKeylet, async (req, res) => {
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
        
        const activeMembership = user?.memberships?.find(m => m.id === accountId);
        const currentUserFullName = activeMembership?.fullName || user?.username || '';
        const isSelf = name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim();

        if (!isSelf && !checkPermission(user, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master or the member themselves can add this record' });
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
        
        const activeMembership = user?.memberships?.find(m => m.id === member.accountId);
        const currentUserFullName = activeMembership?.fullName || user?.username || '';
        const isSelf = member.name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim();

        if (!isSelf && !checkPermission(user, member.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master or the member themselves can update this record' });
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

        const activeMembership = user?.memberships?.find(m => m.id === member.accountId);
        const currentUserFullName = activeMembership?.fullName || user?.username || '';
        const isSelf = member.name?.toLowerCase().trim() === currentUserFullName?.toLowerCase().trim();

        if (!isSelf && !checkPermission(user, member.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master or the member themselves can delete this record' });
        }

        await storage.deleteMember(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

// Get transactions for a template
app.get('/api/transactions', checkIsKeylet, async (req, res) => {
    const { templateId } = req.query;
    try {
        const transactions = await storage.getTransactions(templateId);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
    const { templateId, accountId, type, amount, description, date, uid } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can manage finances' });
        }

        const id = uuidv4();
        const newTx = { id, templateId, accountId, type, amount, description, date };
        await storage.addTransaction(newTx);
        res.json(newTx);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.query;
    try {
        const transactions = await storage.getTransactions();
        const tx = transactions.find(t => t.id === id);
        if (!tx) return res.status(404).json({ error: 'Transaction not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, tx.accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can delete finances' });
        }

        await storage.deleteTransaction(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PROGRAMS ─────────────────────────────────────────────────────────────────

// Get programs for a template
app.get('/api/programs', checkIsKeylet, async (req, res) => {
    const { templateId, accountId } = req.query;
    try {
        const programs = await storage.getPrograms(templateId, accountId);
        res.json(programs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create program
app.post('/api/programs', async (req, res) => {
    const { templateId, accountId, title, content, uid } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, accountId, 'editor')) {
            return res.status(403).json({ error: 'Access denied to manage programs' });
        }

        const id = uuidv4();
        const newProgram = { id, templateId, accountId, title, content, createdAt: new Date().toISOString() };
        await storage.addProgram(newProgram);
        res.json(newProgram);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete program
app.delete('/api/programs/:id', async (req, res) => {
    const { id } = req.params;
    const { uid } = req.query;
    try {
        const programs = await storage.getPrograms();
        const program = programs.find(p => p.id === id);
        if (!program) return res.status(404).json({ error: 'Program not found' });

        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        if (!checkPermission(user, program.accountId, 'editor')) {
            return res.status(403).json({ error: 'Access denied to delete programs' });
        }

        await storage.deleteProgram(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ─── SERVICES ─────────────────────────────────────────────────────────────────

// Get services
app.get('/api/services', checkIsKeylet, async (req, res) => {
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
    const { templateId, memberId, accountId, memberName, serviceDate, serviceType = '', program = '', assignedMembers = [], uid } = req.body;
    try {
        const users = await storage.getUsers();
        const user = users.find(u => u.uid === uid);
        const isSonido = await checkIfSonido(templateId, accountId);
        if (!isSonido && !checkPermission(user, accountId, 'master')) {
            return res.status(403).json({ error: 'Only Master can assign services' });
        }

        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const newService = { id, templateId, memberId, accountId, memberName, serviceDate, serviceType, program, assignedMembers, createdAt };
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
        const isSonido = await checkIfSonido(service.templateId, service.accountId);
        if (!isSonido && !checkPermission(user, service.accountId, 'master')) {
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
        const isSonido = await checkIfSonido(service.templateId, service.accountId);
        if (!isSonido && !checkPermission(user, service.accountId, 'master')) {
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

// In local dev: start HTTP server. In Vercel: just export the handler.
if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ LuminaSync API running on http://localhost:${PORT}`);
    });
}

export default app;
