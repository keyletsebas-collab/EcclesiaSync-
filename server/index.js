import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';

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
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        const accountId = uuidv4().substring(0, 8).toUpperCase();
        const createdAt = new Date().toISOString();
        await pool.query(
            'INSERT INTO users (username, password, isMaster, accountId, createdAt) VALUES (?, ?, ?, ?, ?)',
            [username, password, isMaster ? 1 : 0, accountId, createdAt]
        );
        res.json({ success: true, accountId, username, isMaster });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        const user = rows[0];
        res.json({ success: true, username: user.username, isMaster: !!user.isMaster, accountId: user.accountId });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get all users (admin)
app.get('/api/auth/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT username, isMaster, accountId, createdAt FROM users');
        res.json(rows.map(u => ({ ...u, isMaster: !!u.isMaster })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user role
app.put('/api/auth/users/:username', async (req, res) => {
    const { username } = req.params;
    const { isMaster } = req.body;
    try {
        await pool.query('UPDATE users SET isMaster = ? WHERE username = ?', [isMaster ? 1 : 0, username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete user
app.delete('/api/auth/users/:username', async (req, res) => {
    const { username } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE username = ?', [username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

// Get all templates
app.get('/api/templates', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM templates ORDER BY createdAt DESC');
        res.json(rows.map(r => ({ ...r, customFields: JSON.parse(r.customFields || '[]') })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alias for backward compatibility (ignoring accountId)
app.get('/api/templates/:accountId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM templates ORDER BY createdAt DESC');
        res.json(rows.map(r => ({ ...r, customFields: JSON.parse(r.customFields || '[]') })));
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
        await pool.query(
            'INSERT INTO templates (id, accountId, name, customFields, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, accountId, name, JSON.stringify(customFields), createdAt]
        );
        res.json({ id, accountId, name, customFields, createdAt });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update template
app.put('/api/templates/:id', async (req, res) => {
    const { name, customFields } = req.body;
    try {
        await pool.query(
            'UPDATE templates SET name = ?, customFields = ? WHERE id = ?',
            [name, JSON.stringify(customFields || []), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete template (and cascade members)
app.delete('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM members WHERE templateId = ?', [id]);
        await pool.query('DELETE FROM services WHERE templateId = ?', [id]);
        await pool.query('DELETE FROM templates WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── MEMBERS ──────────────────────────────────────────────────────────────────

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members ORDER BY name ASC');
        res.json(rows.map(r => ({ ...r, identifications: JSON.parse(r.identifications || '{}') })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alias for backward compatibility
app.get('/api/members/:accountId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members ORDER BY name ASC');
        res.json(rows.map(r => ({ ...r, identifications: JSON.parse(r.identifications || '{}') })));
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
        await pool.query(
            'INSERT INTO members (id, templateId, accountId, name, number, phone, identifications, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, templateId, accountId, name, number, phone, JSON.stringify(identifications), createdAt]
        );
        res.json({ id, templateId, accountId, name, number, phone, identifications, createdAt });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update member
app.put('/api/members/:id', async (req, res) => {
    const { name, number, phone, identifications } = req.body;
    try {
        await pool.query(
            'UPDATE members SET name = ?, number = ?, phone = ?, identifications = ? WHERE id = ?',
            [name, number, phone, JSON.stringify(identifications || {}), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM services WHERE memberId = ?', [req.params.id]);
        await pool.query('DELETE FROM members WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── SERVICES ─────────────────────────────────────────────────────────────────

// Get all services
app.get('/api/services', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM services ORDER BY serviceDate ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// For backward compatibility (ignoring accountId)
app.get('/api/services/:accountId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM services ORDER BY serviceDate ASC');
        res.json(rows);
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
        await pool.query(
            'INSERT INTO services (id, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt]
        );
        res.json({ id, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update service
app.put('/api/services/:id', async (req, res) => {
    const { memberName, serviceDate, serviceType } = req.body;
    try {
        await pool.query(
            'UPDATE services SET memberName = ?, serviceDate = ?, serviceType = ? WHERE id = ?',
            [memberName, serviceDate, serviceType, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete service
app.delete('/api/services/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ EcclesiaSync API running on http://localhost:${PORT}`);
        // Diagnostic connection test
        pool.query('SELECT 1')
            .then(() => console.log('✅ DATABASE STATUS: CONNECTED (sql3.freesqldatabase.com)'))
            .catch(err => console.error('❌ DATABASE STATUS: FAILED', err.message));
    });
}

export default app;
