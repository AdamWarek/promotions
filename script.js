// 🔴 REPLACE WITH YOUR REAL VALUES
const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

// ✅ Create Supabase client
const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ✅ Wait until HTML is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const messageDiv = document.getElementById('message');

  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');

  // 🛑 Safety check (important for debugging)
  if (!emailInput || !passwordInput || !signupBtn || !loginBtn) {
    console.error('One or more DOM elements not found');
    return;
  }

  // ✅ Sign up
  signupBtn.addEventListener('click', async () => {
    messageDiv.textContent = 'Signing up...';

    const { error } = await supabase.auth.signUp({
      email: emailInput.value,
      password: passwordInput.value
    });

    if (error) {
      messageDiv.textContent = error.message;
      messageDiv.style.color = 'red';
    } else {
      messageDiv.textContent = 'Signup successful! Check your email.';
      messageDiv.style.color = 'green';
    }
  });

  // ✅ Login
  loginBtn.addEventListener('click', async () => {
    messageDiv.textContent = 'Logging in...';

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value,
      password: passwordInput.value
    });

    if (error) {
      messageDiv.textContent = error.message;
      messageDiv.style.color = 'red';
    } else {
      messageDiv.textContent = 'Logged in successfully!';
      messageDiv.style.color = 'green';
    }
  });
});
