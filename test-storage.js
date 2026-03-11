import { storage } from './api/storage.js';

async function test() {
    try {
        console.log("Fetching members...");
        const members = await storage.getMembers('TEST_ACCOUNT');
        console.log("Members:", members);
    } catch (err) {
        console.error("Error fetching members:", err.message);
    }

    try {
        console.log("Fetching services...");
        const services = await storage.getServices('TEST_ACCOUNT');
        console.log("Services:", services);
    } catch (err) {
        console.error("Error fetching services:", err.message);
    }
}

test();
