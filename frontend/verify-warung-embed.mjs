import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
const env = {};
for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const line = raw.replace(/^\uFEFF/, '').trim();
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run(label, fn) {
  try {
    const r = await fn();
    if (r.error) { console.log(`${label}: ERROR -> ${r.error.message}`); return false; }
    console.log(`${label}: OK (${(r.data || []).length} rows)`);
    return true;
  } catch (e) {
    console.log(`${label}: THREW -> ${e.message}`);
    return false;
  }
}

const listOk = await run('getCustomers select', () =>
  supabase.from('Warung').select('*, User!assigned_sales_id(name), Area(name), Route(name)').limit(5));
const byIdOk = await run('getCustomerById select', () =>
  supabase.from('Warung').select('*, User!assigned_sales_id(name), Area(name), Route(name)').eq('id', 1).limit(1));

console.log('\nRESULT:', JSON.stringify({ listOk, byIdOk }));
process.exit(listOk && byIdOk ? 0 : 1);
