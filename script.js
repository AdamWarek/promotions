// 🔴 DO NOT name this variable "supabase"
const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

// ✅ Correct client creation
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('signup').addEventListener('click', signUp);
  document.getElementById('login').addEventListener('click', login);
});

async function signUp() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  document.getElementById('result').innerText =
    error ? error.message : 'Signup OK – check email if required';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  document.getElementById('result').innerText =
    error ? error.message : 'Login OK';
}
