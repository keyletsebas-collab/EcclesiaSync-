import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const members = await storage.getMembers();
    console.log('--- ALL MEMBERS ---');
    members.forEach(m => {
        console.log(`Member: ${m.name} | ID: ${m.id} | TemplateID: ${m.templateId} | AccountID: ${m.accountId} | Number: ${m.number} | Phone: ${m.phone} | Identifications: ${JSON.stringify(m.identifications)}`);
    });
}

run();
