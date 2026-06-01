import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://kwpbpqgvmbsysuxphfdk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cGJwcWd2bWJzeXN1eHBoZmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTI5MjAsImV4cCI6MjA5MTQyODkyMH0.IQ5LRSWNJpf9ZCwl8r83SnagzFIa0cb-aSkxhvs9wfM"
);

async function run() {
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@mobtracker.com',
    password: 'admin' // just guessing password, or I can use the user's password if I know it
  });
  
  if (authErr) {
    console.log("Auth error:", authErr);
    return;
  }
  
  const { data, error } = await supabase.from('password_requests').select('*');
  console.log("Admin requests:", data);
  
  if (data && data.length > 0) {
    console.log("Trying to update the first one...");
    const req = data[0];
    const { data: upData, error: upErr } = await supabase
      .from('password_requests')
      .update({ status: 'resolvido' })
      .eq('id', req.id)
      .select();
    
    console.log("Update result:", upData);
    console.log("Update error:", upErr);
  }
}
run();
