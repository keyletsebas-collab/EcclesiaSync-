async function checkUsers() {
    const res = await fetch('https://hkmmotgmfsfdxyavsozx.supabase.co/rest/v1/users?select=*', {
        headers: {
            'apikey': 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L',
            'Authorization': 'Bearer sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L'
        }
    });
    const data = await res.json();
    console.log('Users in DB:');
    console.dir(data, { depth: null });
}

checkUsers();
