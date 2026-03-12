import { storage } from './api/storage.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const users = await storage.getUsers();
    const josue = users.find(u => u.username === 'josue');
    const keylet = users.find(u => u.username === 'keylet');

    if (!josue || !keylet) {
        console.error('Josue or Keylet not found');
        return;
    }

    const targetAccountId = keylet.accountId;
    console.log(`Updating josue to accountId: ${targetAccountId}`);

    // Update primary accountId and ensure memberships are correct
    const updates = {
        accountId: targetAccountId
    };

    // If targetAccountId is not in memberships, add it
    const memberships = josue.memberships || [];
    if (!memberships.find(m => m.id === targetAccountId)) {
        memberships.push({ id: targetAccountId, role: 'master', expiresAt: null });
        updates.memberships = memberships;
    } else {
        // Ensure he is master if he is being "put into the account"
        const index = memberships.findIndex(m => m.id === targetAccountId);
        memberships[index].role = 'master';
        updates.memberships = memberships;
    }

    await storage.updateUser(josue.uid, updates);
    console.log('Update complete');
}

run();
