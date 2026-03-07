import { storage } from './api/storage.js';

async function test() {
    try {
        console.log('Testing getTemplates...');
        const res = await storage.getTemplates('044EDFD5');
        console.log('Success:', res);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
