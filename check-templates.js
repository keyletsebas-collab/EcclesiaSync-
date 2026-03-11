import { storage } from './api/storage.js';
async function run() {
    try {
        const templates = await storage.getTemplates('DFC373ED'); // Using admin_test accountId
        console.log('Templates for DFC373ED:', JSON.stringify(templates, null, 2));
        
        const allTemplates = await storage.getAll('Templates');
        console.log('All Templates:', JSON.stringify(allTemplates, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
