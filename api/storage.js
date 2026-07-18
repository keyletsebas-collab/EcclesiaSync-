import supabase from './supabase.js';

/**
 * LuminaSync Storage Layer — Supabase
 */

// ─── Mapping Helpers ─────────────────────────────────────────────────────────

// Map JS object to Supabase row (camelCase -> snake_case)
function userToRow(user) {
    if (!user) return null;
    const row = {
        uid: user.uid,
        username: user.username,
        password: user.password,
        is_master: user.isMaster,
        account_id: user.accountId,
        created_at: user.createdAt,
        is_blocked: user.isBlocked,
        memberships: user.memberships
    };
    if (user.birthday !== undefined && user.birthday !== null) {
        row.birthday = user.birthday;
    }
    if (user.address !== undefined && user.address !== null) {
        row.address = user.address;
    }
    return row;
}

// Map Supabase row to JS object (snake_case -> camelCase)
function userToObj(row) {
    if (!row) return null;
    let memberships = typeof row.memberships === 'string' ? JSON.parse(row.memberships) : row.memberships || [];
    
    // Self-healing: if any membership is missing fullName or phone, recover it from others
    const profile = memberships.find(m => m.fullName) || {};
    const commonName = profile.fullName || row.username;
    const commonPhone = profile.phone || '';
    const commonEmail = profile.email || row.username;
    
    memberships = memberships.map(m => ({
        ...m,
        fullName: m.fullName || commonName,
        phone: m.phone || commonPhone,
        email: m.email || commonEmail
    }));

    return {
        uid: row.uid,
        username: row.username,
        password: row.password,
        isMaster: row.is_master,
        accountId: row.account_id,
        createdAt: row.created_at,
        isBlocked: row.is_blocked,
        memberships,
        birthday: row.birthday,
        address: row.address
    };
}

function templateToRow(template) {
    if (!template) return null;
    return {
        id: template.id,
        account_id: template.accountId,
        name: template.name,
        custom_fields: template.customFields,
        created_at: template.createdAt
    };
}

function templateToObj(row) {
    if (!row) return null;
    return {
        id: row.id,
        accountId: row.account_id,
        name: row.name,
        customFields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields || [],
        createdAt: row.created_at
    };
}

function memberToRow(member) {
    if (!member) return null;
    return {
        id: member.id,
        template_id: member.templateId,
        account_id: member.accountId,
        name: member.name,
        number: (member.number === '' || member.number === null || member.number === undefined) ? 0 : parseInt(member.number, 10),
        phone: member.phone,
        identifications: member.identifications,
        created_at: member.createdAt
    };
}

function memberToObj(row) {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        accountId: row.account_id,
        name: row.name,
        number: row.number,
        phone: row.phone,
        identifications: typeof row.identifications === 'string' ? JSON.parse(row.identifications) : row.identifications || {},
        createdAt: row.created_at
    };
}

function serviceToRow(service) {
    if (!service) return null;
    return {
        id: service.id,
        template_id: service.templateId,
        member_id: service.memberId,
        account_id: service.accountId,
        member_name: service.memberName,
        service_date: service.serviceDate,
        service_type: service.serviceType,
        created_at: service.createdAt,
        program: service.program,
        assigned_members: service.assignedMembers
    };
}

function serviceToObj(row) {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        memberId: row.member_id,
        accountId: row.account_id,
        memberName: row.member_name,
        serviceDate: row.service_date,
        serviceType: row.service_type,
        createdAt: row.created_at,
        program: row.program,
        assignedMembers: typeof row.assigned_members === 'string' ? JSON.parse(row.assigned_members) : row.assigned_members || []
    };
}

function transactionToRow(tx) {
    if (!tx) return null;
    return {
        id: tx.id,
        template_id: tx.templateId,
        account_id: tx.accountId,
        type: tx.type,
        amount: parseFloat(tx.amount),
        description: tx.description,
        date: tx.date
    };
}

function transactionToObj(row) {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        accountId: row.account_id,
        type: row.type,
        amount: parseFloat(row.amount),
        description: row.description,
        date: row.date,
        createdAt: row.created_at
    };
}

function programToRow(program) {
    if (!program) return null;
    return {
        id: program.id,
        template_id: program.templateId,
        account_id: program.accountId,
        title: program.title,
        content: program.content,
        created_at: program.createdAt
    };
}

function programToObj(row) {
    if (!row) return null;
    return {
        id: row.id,
        templateId: row.template_id,
        accountId: row.account_id,
        title: row.title,
        content: row.content,
        createdAt: row.created_at
    };
}


// ─── Storage API ─────────────────────────────────────────────────────────────

export const storage = {

    // ── Users ────────────────────────────────────────────────────────────────

    getUsers: async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data.map(userToObj);
    },

    addUser: async (user) => {
        const row = userToRow({ ...user, isBlocked: false });
        const { error } = await supabase.from('users').insert([row]);
        if (error) {
            console.error('Error adding user:', error);
            throw error;
        }
        return user;
    },

    updateUser: async (uid, updates) => {
        const rowUpdates = {};
        if (updates.username !== undefined) rowUpdates.username = updates.username;
        if (updates.password !== undefined) rowUpdates.password = updates.password;
        if (updates.isMaster !== undefined) rowUpdates.is_master = updates.isMaster;
        if (updates.accountId !== undefined) rowUpdates.account_id = updates.accountId;
        if (updates.isBlocked !== undefined) rowUpdates.is_blocked = updates.isBlocked;
        if (updates.memberships !== undefined) rowUpdates.memberships = updates.memberships;
        if (updates.birthday !== undefined) rowUpdates.birthday = updates.birthday;
        if (updates.address !== undefined) rowUpdates.address = updates.address;

        const { error } = await supabase.from('users').update(rowUpdates).eq('uid', uid);
        if (error) {
            console.error(`Error updating user ${uid}:`, error);
            throw error;
        }
    },

    deleteUser: async (uid) => {
        const { error } = await supabase.from('users').delete().eq('uid', uid);
        if (error) {
            console.error(`Error deleting user ${uid}:`, error);
            throw error;
        }
    },

    // ── Templates ────────────────────────────────────────────────────────────

    getTemplates: async (accountId) => {
        let query = supabase.from('templates').select('*');
        if (accountId) {
            query = query.eq('account_id', accountId);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching templates:', error);
            return [];
        }
        return data.map(templateToObj);
    },

    addTemplate: async (template) => {
        const row = templateToRow(template);
        const { error } = await supabase.from('templates').insert([row]);
        if (error) {
            console.error('Error adding template:', error);
            throw error;
        }
        return template;
    },

    updateTemplate: async (id, updates) => {
        const rowUpdates = {};
        if (updates.name !== undefined) rowUpdates.name = updates.name;
        if (updates.customFields !== undefined) rowUpdates.custom_fields = updates.customFields;
        if (updates.accountId !== undefined) rowUpdates.account_id = updates.accountId;

        const { error } = await supabase.from('templates').update(rowUpdates).eq('id', id);
        if (error) {
            console.error(`Error updating template ${id}:`, error);
            throw error;
        }
    },

    deleteTemplate: async (id) => {
        const { error } = await supabase.from('templates').delete().eq('id', id);
        if (error) {
            console.error(`Error deleting template ${id}:`, error);
            throw error;
        }
    },

    // ── Members ──────────────────────────────────────────────────────────────

    getMembers: async (accountId) => {
        let query = supabase.from('members').select('*');
        if (accountId) {
            query = query.eq('account_id', accountId);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching members:', error);
            return [];
        }
        return data.map(memberToObj);
    },

    addMember: async (member) => {
        const row = memberToRow(member);
        const { error } = await supabase.from('members').insert([row]);
        if (error) {
            console.error('Error adding member:', error);
            throw error;
        }
        return member;
    },

    updateMember: async (id, updates) => {
        const rowUpdates = {};
        if (updates.templateId !== undefined) rowUpdates.template_id = updates.templateId;
        if (updates.accountId !== undefined) rowUpdates.account_id = updates.accountId;
        if (updates.name !== undefined) rowUpdates.name = updates.name;
        if (updates.number !== undefined) {
            rowUpdates.number = (updates.number === '' || updates.number === null || updates.number === undefined) ? 0 : parseInt(updates.number, 10);
        }
        if (updates.phone !== undefined) rowUpdates.phone = updates.phone;
        if (updates.identifications !== undefined) rowUpdates.identifications = updates.identifications;

        const { error } = await supabase.from('members').update(rowUpdates).eq('id', id);
        if (error) {
            console.error(`Error updating member ${id}:`, error);
            throw error;
        }
    },

    deleteMember: async (id) => {
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) {
            console.error(`Error deleting member ${id}:`, error);
            throw error;
        }
    },

    // ── Services ─────────────────────────────────────────────────────────────

    getServices: async (accountId) => {
        let query = supabase.from('services').select('*');
        if (accountId) {
            query = query.eq('account_id', accountId);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching services:', error);
            return [];
        }
        return data.map(serviceToObj);
    },

    addService: async (service) => {
        const row = serviceToRow(service);
        const { error } = await supabase.from('services').insert([row]);
        if (error) {
            console.error('Error adding service:', error);
            throw error;
        }
        return service;
    },

    updateService: async (id, updates) => {
        const rowUpdates = {};
        if (updates.templateId !== undefined) rowUpdates.template_id = updates.templateId;
        if (updates.memberId !== undefined) rowUpdates.member_id = updates.memberId;
        if (updates.accountId !== undefined) rowUpdates.account_id = updates.accountId;
        if (updates.memberName !== undefined) rowUpdates.member_name = updates.memberName;
        if (updates.serviceDate !== undefined) rowUpdates.service_date = updates.serviceDate;
        if (updates.serviceType !== undefined) rowUpdates.service_type = updates.serviceType;
        if (updates.program !== undefined) rowUpdates.program = updates.program;
        if (updates.assignedMembers !== undefined) rowUpdates.assigned_members = updates.assignedMembers;

        const { error } = await supabase.from('services').update(rowUpdates).eq('id', id);
        if (error) {
            console.error(`Error updating service ${id}:`, error);
            throw error;
        }
    },

    deleteService: async (id) => {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) {
            console.error(`Error deleting service ${id}:`, error);
            throw error;
        }
    },

    // ── Transactions ─────────────────────────────────────────────────────────

    getTransactions: async (templateId) => {
        let query = supabase.from('transactions').select('*');
        if (templateId) {
            query = query.eq('template_id', templateId);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
        return data.map(transactionToObj);
    },

    addTransaction: async (tx) => {
        const row = transactionToRow(tx);
        const { error } = await supabase.from('transactions').insert([row]);
        if (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
        return tx;
    },

    deleteTransaction: async (id) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
            console.error(`Error deleting transaction ${id}:`, error);
            throw error;
        }
    },

    // ── Programs ─────────────────────────────────────────────────────────────

    getPrograms: async (templateId, accountId) => {
        let query = supabase.from('programs').select('*');
        if (templateId) {
            query = query.eq('template_id', templateId);
        }
        if (accountId) {
            query = query.eq('account_id', accountId);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching programs:', error);
            return [];
        }
        return data.map(programToObj);
    },

    addProgram: async (program) => {
        const row = programToRow(program);
        const { error } = await supabase.from('programs').insert([row]);
        if (error) {
            console.error('Error adding program:', error);
            throw error;
        }
        return program;
    },

    deleteProgram: async (id) => {
        const { error } = await supabase.from('programs').delete().eq('id', id);
        if (error) {
            console.error(`Error deleting program ${id}:`, error);
            throw error;
        }
    }
};
