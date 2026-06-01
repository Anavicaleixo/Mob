import { createClient } from '@supabase/supabase-js';

// Load Supabase configuration from environment variables (Vite) with fallback to hardcoded values
const supabaseUrl =  "https://kwpbpqgvmbsysuxphfdk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cGJwcWd2bWJzeXN1eHBoZmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTI5MjAsImV4cCI6MjA5MTQyODkyMH0.IQ5LRSWNJpf9ZCwl8r83SnagzFIa0cb-aSkxhvs9wfM";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables not found!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
