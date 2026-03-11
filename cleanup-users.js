import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = (process.env.AIRTABLE_TOKEN || '').trim();
const BASE_ID = (process.env.AIRTABLE_BASE_ID || '').trim();

async function cleanup() {
    console.log('🧹 Cleaning up Airtable Users...');
    
    // 1. Delete Ghost records
    const ghosts = [
        'recQ9IBpyj5XBdCAl',
        'recZ62S2bVpIqHkBc',
        'recg6aZtvsJMXJ0Sp'
    ];
    
    for (const id of ghosts) {
        try {
            const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (res.ok) console.log(`✅ Deleted ghost: ${id}`);
        } catch (e) {
            console.error(`❌ Failed to delete ${id}:`, e);
        }
    }

    // 2. Align Jorge's accountId with Keylet's (044EDFD5)
    const jorgeRecId = 'rectoJ2PD0dW1INf5';
    try {
        const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Users/${jorgeRecId}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: { accountId: '044EDFD5' }
            })
        });
        if (res.ok) console.log(`✅ Aligned Jorge's accountId to 044EDFD5`);
    } catch (e) {
        console.error(`❌ Failed to update Jorge:`, e);
    }
}

cleanup();
