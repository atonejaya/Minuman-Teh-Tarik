import fetch from 'node-fetch';

const url = 'https://jmrfjjwgnvppzscvxxnz.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcmZqandnbnZwcHpzY3Z4eG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjU2MzIsImV4cCI6MjEwMTU0MTYzMn0.dkv52H6-wUWgNmFCsZ8ukTytycH7L9j0JhMTT3Nraeg';

async function run() {
  const res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcmZqandnbnZwcHpzY3Z4eG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjU2MzIsImV4cCI6MjEwMTU0MTYzMn0.dkv52H6-wUWgNmFCsZ8ukTytycH7L9j0JhMTT3Nraeg'
    }
  });
  const data = await res.json();
  console.log('Definitions keys:', Object.keys(data.definitions || {}));
}

run().catch(console.error);
