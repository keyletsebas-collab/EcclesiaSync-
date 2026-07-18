import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const templates = await storage.getTemplates();
    console.log('--- ALL TEMPLATES ---');
    templates.forEach(t => {
        console.log(`Template: ${t.name} | ID: ${t.id} | AccountID: ${t.accountId}`);
    });
}

run();
