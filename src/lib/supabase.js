import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hkmmotgmfsfdxyavsozx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L';

const isDev = import.meta.env.DEV;
console.log(`🔌 [LuminaSync] Conectando a Supabase [Modo: ${isDev ? 'DESARROLLO (localhost)' : 'PRODUCCIÓN'}]`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
