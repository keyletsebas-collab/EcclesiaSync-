async function testUpdateUser() {
    const uid = 'ec5c560a-643b-467c-be31-4b4975be53d9'; // keybas121213
    // Fetch current
    const res = await fetch(`https://hkmmotgmfsfdxyavsozx.supabase.co/rest/v1/users?uid=eq.${uid}&select=*`, {
        headers: {
            'apikey': 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Authorization': 'Bearer sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L'
        }
    });
    const [user] = await res.json();
    console.log('User before update:', user);

    // Update memberships
    const newMemberships = [
        { id: '37E92783', role: 'editor', email: 'keybas121213', phone: '', fullName: 'keybas121213', expiresAt: null }
    ];

    const patchRes = await fetch(`https://hkmmotgmfsfdxyavsozx.supabase.co/rest/v1/users?uid=eq.${uid}`, {
        method: 'PATCH',
        headers: {
            'apikey': 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Authorization': 'Bearer sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ memberships: newMemberships })
    });
    const patchData = await patch-Res.json();
    console.log('Update result:', patchData);
}

testUpdateUser();
