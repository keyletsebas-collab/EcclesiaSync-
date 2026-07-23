async function deleteHectorMembers() {
    const res = await fetch('https://hkmmotgmfsfdxyavsozx.supabase.co/rest/v1/members?name=ilike.Hector*', {
        method: 'DELETE',
        headers: {
            'apikey': 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Authorization': 'Bearer sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Prefer': 'return=representation'
        }
    });
    const deleted = await res.json();
    console.log('Deleted Hector members:', deleted);
}

deleteHectorMembers();
