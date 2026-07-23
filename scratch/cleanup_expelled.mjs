async function cleanupExpelledMembers() {
    // Delete members rows for keybas121213 in account_id E8E427E5
    const deleteRes = await fetch('https://hkmmotgmfsfdxyavsozx.supabase.co/rest/v1/members?account_id=eq.E8E427E5&name=eq.keybas121213', {
        method: 'DELETE',
        headers: {
            'apikey': 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Authorization': 'Bearer sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Prefer': 'return=representation'
        }
    });
    const deleted = await deleteRes.json();
    console.log('Deleted expelled member rows for keybas121213:', deleted);
}

cleanupExpelledMembers();
