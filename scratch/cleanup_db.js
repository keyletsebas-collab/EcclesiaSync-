import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkmmotgmfsfdxyavsozx.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        transport: WebSocket
    }
});

async function run() {
    console.log('--- Inspecting current users and templates ---');
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) console.error('Error fetching users:', uErr);
    else {
        console.log('Users count:', users.length);
        users.forEach(u => console.log(`- Username: ${u.username}, UID: ${u.uid}, AccountID: ${u.account_id}, Birthday: ${u.birthday}`));
    }

    const { data: templates, error: tErr } = await supabase.from('templates').select('*');
    if (tErr) console.error('Error fetching templates:', tErr);
    else {
        console.log('Templates count:', templates.length);
        templates.forEach(t => {
            if (t.name === '__church_metadata__') {
                console.log(`- Church Metadata: AccountID: ${t.account_id}, Fields: ${JSON.stringify(t.custom_fields)}`);
            } else {
                console.log(`- Template: ${t.name}, ID: ${t.id}, AccountID: ${t.account_id}`);
            }
        });
    }

    // Identify keylet user and agustina church
    const keyletUser = users?.find(u => u.username?.toLowerCase() === 'keylet');
    if (!keyletUser) {
        console.error('Keylet user not found!');
        return;
    }

    console.log('\nKeylet user found:', keyletUser.username, keyletUser.uid);

    // Update keylet user birthday to 2012-06-18
    const { error: updErr } = await supabase
        .from('users')
        .update({ birthday: '2012-06-18' })
        .eq('uid', keyletUser.uid);

    if (updErr) console.error('Error updating keylet birthday:', updErr);
    else console.log('✅ Keylet birthday updated to 2012-06-18 successfully.');

    // Delete all users except keylet
    const { error: delUsersErr } = await supabase
        .from('users')
        .delete()
        .neq('username', 'keylet');

    if (delUsersErr) console.error('Error deleting other users:', delUsersErr);
    else console.log('✅ All non-keylet users deleted.');

    // Find Agustina church account_id
    // From screenshot, Agustina code is E8E427E5 ("Central la Agustina")
    const agustinaAccountId = 'E8E427E5';

    // Delete all templates/churches where account_id is NOT E8E427E5
    const { error: delTemplatesErr } = await supabase
        .from('templates')
        .delete()
        .neq('account_id', agustinaAccountId);

    if (delTemplatesErr) console.error('Error deleting non-Agustina templates:', delTemplatesErr);
    else console.log('✅ All non-Agustina templates/churches deleted.');

    // Delete all members, services, programs belonging to other account_ids
    const { error: delMembersErr } = await supabase.from('members').delete().neq('account_id', agustinaAccountId);
    if (delMembersErr) console.error('Error deleting members:', delMembersErr);
    else console.log('✅ Non-Agustina members cleaned up.');

    const { error: delServicesErr } = await supabase.from('services').delete().neq('account_id', agustinaAccountId);
    if (delServicesErr) console.error('Error deleting services:', delServicesErr);
    else console.log('✅ Non-Agustina services cleaned up.');

    const { error: delProgramsErr } = await supabase.from('programs').delete().neq('account_id', agustinaAccountId);
    if (delProgramsErr) console.error('Error deleting programs:', delProgramsErr);
    else console.log('✅ Non-Agustina programs cleaned up.');

    // Clean keylet memberships to only include E8E427E5
    const cleanMemberships = [{
        id: agustinaAccountId,
        role: 'master',
        fullName: 'keylet',
        phone: '',
        email: 'keylet',
        expiresAt: null
    }];

    const { error: updKeyletMemErr } = await supabase
        .from('users')
        .update({
            account_id: agustinaAccountId,
            is_master: true,
            memberships: cleanMemberships
        })
        .eq('uid', keyletUser.uid);

    if (updKeyletMemErr) console.error('Error updating keylet memberships:', updKeyletMemErr);
    else console.log('✅ Keylet memberships cleaned up to Agustina church (E8E427E5).');

    console.log('\n--- Cleanup Complete ---');
}

run();
