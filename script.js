// =======================
// Replace with your Supabase details
const supabaseUrl = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';  // Example: https://xyz.supabase.co
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';      // Example: public anon key
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
// =======================

// Wait until DOM is loaded
document.addEventListener('DOMContentLoaded', () => {

  // Buttons
  const signupBtn = document.getElementById('signup-btn');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const submitPromoBtn = document.getElementById('submit-promo-btn');

  // Attach event listeners
  signupBtn.addEventListener('click', handleSignUp);
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  submitPromoBtn.addEventListener('click', submitPromotion);

  // Check if user is logged in on page load
  checkAuth();
  fetchPromotions();
});

// =======================
// Auth Functions
async function handleSignUp() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  document.getElementById('auth-message').innerText = error ? error.message : 'Sign up successful! Check your email.';
  checkAuth();
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  document.getElementById('auth-message').innerText = error ? error.message : 'Logged in successfully!';
  checkAuth();
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  document.getElementById('auth-message').innerText = error ? error.message : 'Logged out';
  checkAuth();
}

// =======================
// Check auth and toggle promotion section
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    document.getElementById('promotion-section').style.display = 'block';
  } else {
    document.getElementById('promotion-section').style.display = 'none';
  }
}

// =======================
// Submit promotion
async function submitPromotion() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { alert('You must be logged in to submit a promotion.'); return; }

  const title = document.getElementById('promo-title').value;
  const link = document.getElementById('promo-link').value;
  const category = document.getElementById('promo-category').value;
  const description = document.getElementById('promo-desc').value;

  const { data, error } = await supabase
    .from('promotions')
    .insert([{ title, link, category, description, user_id: user.id }]);

  if (error) alert(error.message);
  else {
    alert('Promotion submitted!');
    fetchPromotions();
    document.getElementById('promo-title').value = '';
    document.getElementById('promo-link').value = '';
    document.getElementById('promo-category').value = '';
    document.getElementById('promo-desc').value = '';
  }
}

// =======================
// Fetch promotions feed
async function fetchPromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  if (error) feed.innerHTML = 'Error loading promotions.';
  else {
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = 'promo-card';
      div.innerHTML = `
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <p><b>Category:</b> ${p.category}</p>
        <a href="${p.link}" target="_blank">Go to deal</a>
      `;
      feed.appendChild(div);
    });
  }
}
