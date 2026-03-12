import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const users = await storage.getUsers();
    console.log('--- ALL USERS ---');
    users.forEach(u => {
        console.log(`User: ${u.username} | UID: ${u.uid} | AccountID: ${u.accountId} | Memberships: ${JSON.stringify(u.memberships)}`);
    });
}

run();
