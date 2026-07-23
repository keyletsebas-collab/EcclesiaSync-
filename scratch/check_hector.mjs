async function checkMembers() {
    const res = await fetch('https://hkmmotgmfsfdxyavsozx.supabase.co/rest/v1/members?select=*', {
        headers: {
            'apikey': 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Authorization': 'Bearer sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L'
        }
    });
    const data = await res.json();
    console.log('All Members in DB:');
    console.dir(data, { depth: null });
}

checkMembers();
