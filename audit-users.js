import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function audit() {
    console.log('🔍 Full user data dump...');
    const users = await storage.getUsers();
    
    users.forEach((u, i) => {
        console.log(`[${i}] RecID: ${u._recId}`);
        console.log(`    User: "${u.username}"`);
        console.log(`    Pass: "${u.password}"`);
        console.log(`    AccID: "${u.accountId}"`);
        console.log(`    isMaster: ${u.isMaster}`);
        console.log(`    Created: ${u.createdAt}`);
        console.log('----------------------------');
    });
}

audit();
