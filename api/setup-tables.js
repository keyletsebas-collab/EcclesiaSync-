/**
 * setup-tables.js
 * Adds missing fields to Members and Services tables in Airtable
 * using the Airtable Metadata API.
 *
 * Run: node api/setup-tables.js
 */

import dotenv from 'dotenv';
dotenv.config();

const TOKEN = (process.env.AIRTABLE_TOKEN || '').trim();
const BASE_ID = (process.env.AIRTABLE_BASE_ID || '').trim();

if (!TOKEN || !BASE_ID) {
    console.error('❌ Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID in .env');
    process.exit(1);
}

const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
};

// First, list all tables to get their IDs
async function getTableIds() {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, { headers });
    const data = await res.json();
    if (!res.ok) {
        if (res.status === 403) {
            console.error('\n❌ Permission Denied (403): Your AIRTABLE_TOKEN lacks the required scopes.');
            console.error('Please ensure your token has "schema.bases:read" and "schema.bases:write" scopes.');
            console.error('Go to: https://airtable.com/create/tokens to update your token.\n');
        } else {
            console.error(`Failed to list tables: ${res.status} ${JSON.stringify(data)}`);
        }
        process.exit(1);
    }
    return data.tables;
}

async function createField(tableId, tableName, field) {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${tableId}/fields`, {
        method: 'POST',
        headers,
        body: JSON.stringify(field)
    });
    const data = await res.json();
    if (res.ok) {
        console.log(`  ✅ Created field "${field.name}" in ${tableName}`);
    } else {
        // DUPLICATE_FIELD_NAME is fine - field already exists
        if (data.error === 'INVALID_REQUEST_UNKNOWN' || (data.error && data.message?.includes('already exists'))) {
            console.log(`  ℹ️  Field "${field.name}" already exists in ${tableName}`);
        } else {
            console.error(`  ❌ Failed to create "${field.name}" in ${tableName}: ${JSON.stringify(data)}`);
        }
    }
}

const MEMBERS_FIELDS = [
    { name: 'id', type: 'singleLineText' },
    { name: 'templateId', type: 'singleLineText' },
    { name: 'accountId', type: 'singleLineText' },
    { name: 'name', type: 'singleLineText' },
    { name: 'number', type: 'number', options: { precision: 0 } },
    { name: 'phone', type: 'singleLineText' },
    { name: 'identifications', type: 'multilineText' },
    { name: 'createdAt', type: 'singleLineText' },
];

const SERVICES_FIELDS = [
    { name: 'id', type: 'singleLineText' },
    { name: 'templateId', type: 'singleLineText' },
    { name: 'memberId', type: 'singleLineText' },
    { name: 'accountId', type: 'singleLineText' },
    { name: 'memberName', type: 'singleLineText' },
    { name: 'serviceDate', type: 'singleLineText' },
    { name: 'serviceType', type: 'singleLineText' },
    { name: 'createdAt', type: 'singleLineText' },
];

async function setup() {
    console.log('🔧 Setting up Airtable tables...\n');

    const tables = await getTableIds();
    const membersTable = tables.find(t => t.name === 'Members');
    const servicesTable = tables.find(t => t.name === 'Services');

    if (!membersTable) {
        console.error('❌ Table "Members" not found in base. Create it manually in Airtable first.');
        process.exit(1);
    }
    if (!servicesTable) {
        console.error('❌ Table "Services" not found in base. Create it manually in Airtable first.');
        process.exit(1);
    }

    console.log('📋 Adding fields to Members table...');
    for (const field of MEMBERS_FIELDS) {
        await createField(membersTable.id, 'Members', field);
    }

    console.log('\n📋 Adding fields to Services table...');
    for (const field of SERVICES_FIELDS) {
        await createField(servicesTable.id, 'Services', field);
    }

    console.log('\n✅ Setup complete! Your tables should now have the correct fields.');
}

setup().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
