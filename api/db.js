import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

const token = (process.env.AIRTABLE_TOKEN || '').trim();
const baseId = (process.env.AIRTABLE_BASE_ID || '').trim();

if (!token) {
    console.error('❌ Missing AIRTABLE_TOKEN in .env file');
}
if (!baseId) {
    console.error('❌ Missing AIRTABLE_BASE_ID in .env file');
}

const base = new Airtable({ apiKey: token }).base(baseId);

export default base;
