// Polyfill WebSocket for Node.js environments below v22
if (typeof globalThis.WebSocket === 'undefined') {
    try {
        const wsModule = await import('ws');
        globalThis.WebSocket = wsModule.default || wsModule;
    } catch (e) {
        console.warn('⚠️ WebSockets not available');
    }
}

import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log('🧹 Starting database member duplicates cleanup...');
    try {
        const members = await storage.getMembers();
        
        // Group members by templateId
        const templatesMap = {};
        members.forEach(m => {
            if (!templatesMap[m.templateId]) {
                templatesMap[m.templateId] = [];
            }
            templatesMap[m.templateId].push(m);
        });

        for (const templateId of Object.keys(templatesMap)) {
            const templateMembers = templatesMap[templateId];
            
            // Group by name (lowercase, trimmed)
            const nameGroups = {};
            templateMembers.forEach(m => {
                const nameKey = m.name?.toLowerCase().trim() || '';
                if (nameKey) {
                    if (!nameGroups[nameKey]) {
                        nameGroups[nameKey] = [];
                    }
                    nameGroups[nameKey].push(m);
                }
            });

            for (const nameKey of Object.keys(nameGroups)) {
                const group = nameGroups[nameKey];
                if (group.length > 1) {
                    console.log(`⚠️ Found ${group.length} duplicates for member "${nameKey}" in template ${templateId}`);
                    
                    // Sort by number ascending, then createdAt ascending
                    group.sort((a, b) => {
                        if (a.number !== b.number) return a.number - b.number;
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    });

                    // Keep the first one, delete the rest
                    const keep = group[0];
                    const toDelete = group.slice(1);
                    
                    console.log(`✅ Keeping member ID: ${keep.id} (Number: ${keep.number})`);
                    
                    for (const dup of toDelete) {
                        console.log(`❌ Deleting duplicate member ID: ${dup.id} (Number: ${dup.number})`);
                        await storage.deleteMember(dup.id);
                    }
                }
            }
        }
        console.log('🎉 Cleanup complete!');
    } catch (err) {
        console.error('❌ Error during cleanup:', err);
    }
}

run();
