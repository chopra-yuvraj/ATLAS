require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Connecting to Supabase at:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  // Get all users
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) { console.error('Auth error:', uErr); return; }
  
  console.log('Found', users.users.length, 'users in auth');
  
  for (const user of users.users) {
    console.log('Processing user:', user.email, 'ID:', user.id);
    
    // Check if staff profile exists
    const { data: existing } = await supabase.from('staff').select('*').eq('user_id', user.id).single();
    
    if (existing) {
      console.log(' - Staff profile already exists for this user.');
      // Make sure it is active and has correct role
      await supabase.from('staff').update({ is_active: true, role: 'admin' }).eq('id', existing.id);
      continue;
    }
    
    // Create staff profile
    const { error: insertErr } = await supabase.from('staff').insert({
      user_id: user.id,
      full_name: (user.email || 'Admin User').split('@')[0],
      role: 'admin',
      badge_number: 'STAFF-' + Math.floor(Math.random() * 1000),
      department: 'Emergency',
      is_active: true
    });
    
    if (insertErr) {
      console.error(' - Failed to create staff profile:', insertErr);
    } else {
      console.log(' - Created new staff profile!');
    }
  }
}

run();
