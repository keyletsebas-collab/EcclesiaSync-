/**
 * Airtable doesn't need schema initialization - tables must be created manually.
 * 
 * Run this script to verify your Airtable connection and list tables:
 *   node api/init-db.js
 */

import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

const TABLES = ['Users', 'Templates', 'Members', 'Services'];

async function verify() {
    console.log('🔄 Verifying Airtable connection...');
    let allOk = true;
    for (const table of TABLES) {
        try {
            const records = await base(table).select({ maxRecords: 1 }).firstPage();
            console.log(`  ✅ Table "${table}" found (${records.length === 1 ? '1+ records' : 'empty'})`);
        } catch (err) {
            console.error(`  ❌ Table "${table}" error: ${err.message}`);
            allOk = false;
        }
    }
    if (allOk) {
        console.log('\n✅ All Airtable tables connected successfully!');
    } else {
        console.log('\n⚠️  Some tables are missing. Create them in your Airtable base.');
        console.log('   See api/storage.js for the required field names per table.');
    }
}

verify();
