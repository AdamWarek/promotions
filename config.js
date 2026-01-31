// Supabase Configuration
// Replace these with your actual Supabase project credentials
// You can find these in your Supabase project settings

const SUPABASE_URL = 'https://jivwtdvuwctwwxjoztow.supabase.co'; // Example: https://xxxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppdnd0ZHZ1d2N0d3d4am96dG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTgyNTMsImV4cCI6MjA4NTQzNDI1M30.8Woz-OZw-qYZTjpzLWNvehEX6ni-tOiNWGwl__rcbyU'; // Your anon/public key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
