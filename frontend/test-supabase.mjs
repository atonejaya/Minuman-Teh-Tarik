import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jmrfjjwgnvppzscvxxnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcmZqandnbnZwcHpzY3Z4eG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjU2MzIsImV4cCI6MjEwMTU0MTYzMn0.dkv52H6-wUWgNmFCsZ8ukTytycH7L9j0JhMTT3Nraeg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching schema for SalesStockIssue...');
  const { data, error } = await supabase
    .from('SalesStockIssue')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching ledger:', error);
  } else {
    console.log('Sample data:', data);
  }
}

run().catch(console.error);
