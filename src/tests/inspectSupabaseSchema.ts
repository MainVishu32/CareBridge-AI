/**
 * Schema Verification Script
 * Probes the live Supabase instance for all 10 tables.
 * Reports exact availability status without assuming.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): { url: string; key: string } {
  const envPath = path.resolve(process.cwd(), '.env');
  let url = process.env.VITE_SUPABASE_URL || '';
  let key = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (k.trim() === 'VITE_SUPABASE_URL') url = val;
      if (k.trim() === 'VITE_SUPABASE_ANON_KEY') key = val;
    }
  }

  const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  return { url: cleanUrl, key: key.trim() };
}

async function inspectSchema() {
  const { url, key } = loadEnv();
  const client = createClient(url, key);

  const tables = [
    'profiles',
    'care_profiles',
    'care_members',
    'invitations',
    'medications',
    'medication_schedules',
    'medication_logs',
    'appointments',
    'notifications',
    'activity_logs',
  ];

  console.log('================================================================');
  console.log(`--- PROBING SUPABASE PROJECT SCHEMA: CareBridge-AI ---`);
  console.log(`URL: ${url}`);
  console.log('================================================================\n');

  const results: Record<string, { status: string; detail: string }> = {};

  for (const table of tables) {
    const { error } = await client.from(table).select('*').limit(0);
    if (!error) {
      results[table] = { status: 'AVAILABLE', detail: 'Table exists and responded to query' };
      console.log(`✓ [EXISTS] Table '${table}' is available on Supabase.`);
    } else if (error.message.includes('Could not find the table') || error.code === 'PGRST205' || error.code === '42P01') {
      results[table] = { status: 'PENDING_CREATION', detail: error.message };
      console.log(`○ [NOT YET CREATED] Table '${table}' does not exist yet.`);
    } else {
      results[table] = { status: 'ERROR', detail: error.message };
      console.log(`! [RESPONSE] Table '${table}': ${error.message}`);
    }
  }

  console.log('\n================================================================');
  return results;
}

inspectSchema().catch(console.error);
