import { storage } from './api/storage.js';
async function run() {
    try {
        const users = await storage.getUsers();
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
