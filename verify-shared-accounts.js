import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function test() {
    console.log('🧪 Starting Shared Account Verification...\n');

    // 1. Test Case-Insensitive Login
    console.log('--- Test 1: Case-Insensitive Login ---');
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'KEYLET', password: 'keybas121213' }) // Upper case
        });
        const data = await res.json();
        if (data.success && data.username === 'keylet' && data.accountId === '044EDFD5') {
            console.log('✅ Success: Login "KEYLET" found record "keylet" with ID 044EDFD5.');
        } else {
            console.log('❌ Failure:', data);
        }
    } catch (e) {
        console.error('Test 1 Errored:', e.message);
    }

    // 2. Test Account Joining
    console.log('\n--- Test 2: Account Joining (Signup) ---');
    const testUser = `test_joiner_${Date.now()}`;
    try {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: testUser, 
                password: 'password123',
                accountId: '044EDFD5' // Joining Keylet's account
            })
        });
        const data = await res.json();
        if (data.success && data.accountId === '044EDFD5') {
            console.log(`✅ Success: User "${testUser}" joined account 044EDFD5.`);
        } else {
            console.log('❌ Failure:', data);
        }
    } catch (e) {
        console.error('Test 2 Errored:', e.message);
    }
}

test();
