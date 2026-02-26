import base from './db.js';

/**
 * EcclesiaSync Storage Layer — Airtable
 *
 * Airtable table structure required (create these in your Base):
 *
 *  ┌─ Users ──────────────────────────────────────────────────────────┐
 *  │  uid (Single line text)   username (Single line text, unique)    │
 *  │  password (Single line)   isMaster (Checkbox)                    │
 *  │  accountId (Single line)  createdAt (Single line)                │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ Templates ──────────────────────────────────────────────────────┐
 *  │  id (Single line)   accountId (Single line)   name (Single line) │
 *  │  customFields (Long text / JSON)   createdAt (Single line)       │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ Members ────────────────────────────────────────────────────────┐
 *  │  id (Single line)      templateId (Single line)                  │
 *  │  accountId (Single)    name (Single line)   number (Number)      │
 *  │  phone (Single line)   identifications (Long text / JSON)        │
 *  │  createdAt (Single line)                                         │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ┌─ Services ───────────────────────────────────────────────────────┐
 *  │  id (Single)       templateId (Single)    memberId (Single)      │
 *  │  accountId (Single)  memberName (Single)  serviceDate (Single)   │
 *  │  serviceType (Single)  createdAt (Single)                        │
 *  └──────────────────────────────────────────────────────────────────┘
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte un record de Airtable a objeto plano */
function toObj(record) {
    return { _recId: record.id, ...record.fields };
}

/** Obtiene todos los registros de una tabla con filtro opcional */
async function getAll(table, formula = '') {
    const records = [];
    const opts = formula ? { filterByFormula: formula } : {};
    await base(table).select(opts).eachPage((page, next) => {
        page.forEach(r => records.push(toObj(r)));
        next();
    });
    return records;
}

/** JSON stringify seguro para campos que deben ser strings */
const jsonStr = v => (typeof v === 'object' ? JSON.stringify(v) : v ?? '');

// ─── Storage API ──────────────────────────────────────────────────────────────

export const storage = {

    // ── Users ─────────────────────────────────────────────────────────────────

    getUsers: () => getAll('Users'),

    addUser: async (user) => {
        const { uid, username, password, isMaster, accountId, createdAt } = user;
        await base('Users').create([{
            fields: { uid, username, password, isMaster: !!isMaster, accountId, createdAt }
        }]);
        return user;
    },

    updateUser: async (uid, updates) => {
        // Buscar el record ID de Airtable primero
        const records = await getAll('Users', `{uid} = '${uid}'`);
        if (!records.length) return;
        await base('Users').update(records[0]._recId, updates);
    },

    deleteUser: async (uid) => {
        const records = await getAll('Users', `{uid} = '${uid}'`);
        if (records.length) await base('Users').destroy(records[0]._recId);
    },

    // ── Templates ─────────────────────────────────────────────────────────────

    getTemplates: (accountId) =>
        getAll('Templates', `{accountId} = '${accountId}'`),

    addTemplate: async (template) => {
        const { id, accountId, name, customFields, createdAt } = template;
        await base('Templates').create([{
            fields: { id, accountId, name, customFields: jsonStr(customFields), createdAt }
        }]);
        return template;
    },

    updateTemplate: async (id, updates) => {
        const records = await getAll('Templates', `{id} = '${id}'`);
        if (!records.length) return;
        const fields = { ...updates };
        if (fields.customFields) fields.customFields = jsonStr(fields.customFields);
        await base('Templates').update(records[0]._recId, fields);
    },

    deleteTemplate: async (id) => {
        // Borrar services y members dependientes primero
        const services = await getAll('Services', `{templateId} = '${id}'`);
        const members = await getAll('Members', `{templateId} = '${id}'`);
        for (const r of services) await base('Services').destroy(r._recId);
        for (const r of members) await base('Members').destroy(r._recId);
        const templates = await getAll('Templates', `{id} = '${id}'`);
        if (templates.length) await base('Templates').destroy(templates[0]._recId);
    },

    // ── Members ───────────────────────────────────────────────────────────────

    getMembers: (accountId) =>
        getAll('Members', `{accountId} = '${accountId}'`),

    addMember: async (member) => {
        const { id, templateId, accountId, name, number, phone, identifications, createdAt } = member;
        await base('Members').create([{
            fields: {
                id, templateId, accountId,
                name: name ?? '',
                number: number ?? 0,
                phone: phone ?? '',
                identifications: jsonStr(identifications),
                createdAt
            }
        }]);
        return member;
    },

    updateMember: async (id, updates) => {
        const records = await getAll('Members', `{id} = '${id}'`);
        if (!records.length) return;
        const fields = { ...updates };
        if (fields.identifications) fields.identifications = jsonStr(fields.identifications);
        await base('Members').update(records[0]._recId, fields);
    },

    deleteMember: async (id) => {
        const services = await getAll('Services', `{memberId} = '${id}'`);
        for (const r of services) await base('Services').destroy(r._recId);
        const members = await getAll('Members', `{id} = '${id}'`);
        if (members.length) await base('Members').destroy(members[0]._recId);
    },

    // ── Services ──────────────────────────────────────────────────────────────

    getServices: (accountId) =>
        getAll('Services', `{accountId} = '${accountId}'`),

    addService: async (service) => {
        const { id, templateId, memberId, accountId, memberName, serviceDate, serviceType, createdAt } = service;
        await base('Services').create([{
            fields: { id, templateId, memberId, accountId, memberName, serviceDate, serviceType: serviceType ?? '', createdAt }
        }]);
        return service;
    },

    updateService: async (id, updates) => {
        const records = await getAll('Services', `{id} = '${id}'`);
        if (!records.length) return;
        await base('Services').update(records[0]._recId, updates);
    },

    deleteService: async (id) => {
        const records = await getAll('Services', `{id} = '${id}'`);
        if (records.length) await base('Services').destroy(records[0]._recId);
    }
};
