import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Polyfill WebSocket for Node.js environments below v22
if (typeof globalThis.WebSocket === 'undefined') {
    try {
        const wsModule = await import('ws');
        globalThis.WebSocket = wsModule.default || wsModule;
    } catch (e) {
        console.warn('⚠️ WebSockets not available, using fallback constructor');
        globalThis.WebSocket = class DummyWebSocket {
            constructor() {
                throw new Error("Realtime WebSockets are not supported in this environment.");
            }
        };
    }
}

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl) {
    console.error('❌ Missing SUPABASE_URL in .env file');
}
if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

export default supabase;
