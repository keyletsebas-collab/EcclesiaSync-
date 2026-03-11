import { storage } from './api/storage.js';

async function test() {
    try {
        console.log("Adding member...");
        const res = await storage.addMember({
            id: 'test-id',
            templateId: 'test-template-id',
            accountId: 'test-account-id',
            name: 'Test Member',
            number: 1,
            phone: '123456',
            identifications: {},
            createdAt: new Date().toISOString()
        });
        console.log("Success:", res);

        await storage.deleteMember('test-id');
    } catch (err) {
        console.error("Error adding member:");
        console.error(err);
    }
}

test();
