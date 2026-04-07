// scripts/setup_test_token.mjs
// Run with: node scripts/setup_test_token.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('\n=== ATLAS Test Setup ===\n');

    // Step 1: List all auth users and ensure they have staff profiles
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
        console.error('Failed to list auth users:', authErr.message);
        return;
    }

    console.log(`Found ${authData.users.length} auth user(s).\n`);

    for (const user of authData.users) {
        console.log(`User: ${user.email} (${user.id})`);

        const { data: existing } = await supabase
            .from('staff')
            .select('id, role, is_active')
            .eq('user_id', user.id)
            .single();

        if (existing) {
            console.log(`  Staff profile exists (role=${existing.role}, active=${existing.is_active})`);
            if (!existing.is_active) {
                await supabase.from('staff').update({ is_active: true }).eq('id', existing.id);
                console.log('  -> Reactivated.');
            }
        } else {
            const name = (user.email || 'Admin').split('@')[0];
            const { data: newStaff, error: insertErr } = await supabase.from('staff').insert({
                user_id: user.id,
                full_name: name,
                role: 'admin',
                badge_number: 'STAFF-' + String(Math.floor(1000 + Math.random() * 9000)),
                department: 'Emergency',
                is_active: true
            }).select('id').single();

            if (insertErr) {
                console.error('  FAILED to create staff profile:', insertErr.message);
            } else {
                console.log(`  Created staff profile: ${newStaff.id}`);
            }
        }
    }

    // Step 2: Find a patient to generate a token for
    let { data: patients, error: patErr } = await supabase
        .from('patients')
        .select('id, full_name, date_of_birth, mrn')
        .limit(5);

    if (patErr) {
        console.error('\nFailed to fetch patients:', patErr.message);
        return;
    }

    if (!patients || patients.length === 0) {
        console.log('\nNo patients exist! Create one via the Intake form first.');
        return;
    }

    const patient = patients[0];
    console.log(`\nGenerating token for: ${patient.full_name} (${patient.mrn})`);

    // Get staff ID for generated_by
    const { data: staffList } = await supabase.from('staff').select('id').eq('is_active', true).limit(1);
    const staffId = staffList?.[0]?.id;

    if (!staffId) {
        console.error('No active staff found!');
        return;
    }

    // Generate a readable token
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const tokenCode = `ATLAS-${code}`;

    const { data: token, error: tokErr } = await supabase
        .from('patient_login_tokens')
        .insert({
            patient_id: patient.id,
            token_code: tokenCode,
            dob_verification: patient.date_of_birth,
            generated_by: staffId,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_used: false,
        })
        .select()
        .single();

    if (tokErr) {
        console.error('Failed to create token:', tokErr.message);
        return;
    }

    console.log('\n' + '='.repeat(50));
    console.log('  TEST TOKEN GENERATED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`  Token Code : ${tokenCode}`);
    console.log(`  Patient    : ${patient.full_name}`);
    console.log(`  DOB        : ${patient.date_of_birth}`);
    console.log(`  Expires    : ${token.expires_at}`);
    console.log('='.repeat(50));
    console.log('\nUse this at http://localhost:3000/patient/login');
    console.log('Enter the token code and the DOB shown above.\n');

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
