import supabase from '../api/supabase.js';

async function check() {
    const { data, error } = await supabase.from('templates').select('*').limit(1);
    if (error) {
        console.error('Error fetching templates:', error);
    } else {
        console.log('Template columns:', data.length > 0 ? Object.keys(data[0]) : 'No templates found');
    }
}

check();
