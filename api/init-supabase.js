import supabase from './supabase.js';

async function verify() {
    console.log('🔄 Verifying Supabase connection...');
    const tables = ['users', 'templates', 'members', 'services'];
    let allOk = true;

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.error(`  ❌ Table "${table}" error: ${error.message}`);
                allOk = false;
            } else {
                console.log(`  ✅ Table "${table}" connected (${data.length === 1 ? '1+ records' : 'empty'})`);
            }
        } catch (err) {
            console.error(`  ❌ Table "${table}" exception: ${err.message}`);
            allOk = false;
        }
    }

    if (allOk) {
        console.log('\n✅ All Supabase tables connected successfully!');
    } else {
        console.log('\n⚠️  Some tables are missing or not accessible. Make sure to run the SQL schema in your Supabase SQL Editor.');
    }
}

verify();
