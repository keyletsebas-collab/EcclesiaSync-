import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    console.log('🚀 Starting User Membership Migration...');
    const users = await storage.getUsers();
    console.log(`📊 Found ${users.length} users to migrate.`);

    for (const user of users) {
        if (!user.uid) continue;
        
        // If memberships already exists and is valid, skip
        if (Array.isArray(user.memberships) && user.memberships.length > 0) {
            console.log(`  ℹ️ Skipping ${user.username} (already has memberships).`);
            continue;
        }

        // Initialize memberships based on current accountId and isMaster status
        const initialMembership = {
            id: user.accountId || '044EDFD5', // Default to common account if missing
            role: user.isMaster ? 'master' : 'editor',
            expiresAt: null
        };

        console.log(`  🔄 Migrating ${user.username}...`);
        try {
            await storage.updateUser(user.uid, {
                memberships: [initialMembership]
            });
            console.log(`    ✅ Success: Membership initialized for ${user.username}`);
        } catch (e) {
            console.error(`    ❌ Failed to migrate ${user.username}:`, e.message);
        }
    }

    console.log('\n✅ Migration complete!');
}

migrate();
