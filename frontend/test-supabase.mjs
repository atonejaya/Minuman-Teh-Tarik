import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jmrfjjwgnvppzscvxxnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcmZqandnbnZwcHpzY3Z4eG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjU2MzIsImV4cCI6MjEwMTU0MTYzMn0.dkv52H6-wUWgNmFCsZ8ukTytycH7L9j0JhMTT3Nraeg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const [user, area, route] = await Promise.all([
    supabase.from('User').select('id, name').limit(1),
    supabase.from('Area').select('id, name').limit(1),
    supabase.from('Route').select('id, name').limit(1),
  ]);
  console.log('User:', JSON.stringify(user));
  console.log('Area:', JSON.stringify(area));
  console.log('Route:', JSON.stringify(route));
}

run().catch(console.error);
