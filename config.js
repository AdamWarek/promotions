// Supabase Configuration
// IMPORTANT: Replace these values with your actual Supabase project credentials
// You can find these in your Supabase project settings under API

// Your Supabase Project URL (Example: https://xxxxxxxxxxxxx.supabase.co)
const SUPABASE_URL = 'https://jivwtdvuwctwwxjoztow.supabase.co';

// Your Supabase anon/public key (Long string starting with eyJ...)
const SUPABASE_ANON_KEY = '
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppdnd0ZHZ1d2N0d3d4am96dG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTgyNTMsImV4cCI6MjA4NTQzNDI1M30.8Woz-OZw-qYZTjpzLWNvehEX6ni-tOiNWGwl__rcbyU';

// Validate configuration
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('⚠️ SUPABASE NOT CONFIGURED! Please edit config.js with your actual credentials.');
    console.error('Get your credentials from: https://app.supabase.com → Your Project → Settings → API');
}

// Initialize Supabase client
let supabase;
try {
    if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized successfully');
    } else {
        console.error('❌ Failed to initialize Supabase client');
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
}
