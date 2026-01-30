const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

// Renamed to avoid collision with global 'supabase' library object
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('authSection');
  const promoSection = document.getElementById('promoSection');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const messageDiv = document.getElementById('message');
  const userDisplay = document.getElementById('userDisplay');

  let currentUser = null;

  // UI Helper to switch views
  function updateUI(user) {
    currentUser = user;
    if (user) {
      authSection.style.display = 'none';
      promoSection.style.display = 'block';
      userDisplay.textContent = `Logged in as: ${user.email}`;
      loadPromotions();
    } else {
      authSection.style.display = 'block';
      promoSection.style.display = 'none';
      messageDiv.textContent = '';
    }
  }

  // Check for existing session on load
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) updateUI(data.session.user);
  });

  // SIGNUP
  document.getElementById('signupBtn').addEventListener('click', async () => {
    messageDiv.textContent = 'Creating account...';
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
      });

      if (error) throw error;
      
      // If user is created but not logged in (Email confirmation active)
      if (data.user && data.session === null) {
        messageDiv.style.color = 'orange';
        messageDiv.textContent = 'Signup successful! Check your email for a confirmation link.';
      } else {
        updateUI(data.user);
      }
    } catch (err) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = err.message;
    }
  });

  // LOGIN
  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.textContent = 'Logging in...';
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
      });
      if (error) throw error;
      updateUI(data.user);
    } catch (err) {
      messageDiv.style.color = 'red';
      messageDiv.textContent = err.message;
    }
  });

  // LOGOUT
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    updateUI(null);
  });

  // ADD PROMOTION
  document.getElementById('addPromoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('promoTitle').value;
    const desc = document.getElementById('promoDesc').value;

    try {
      const { error } = await supabaseClient.from('promotions').insert([
        { title, description: desc, user_id: currentUser.id }
      ]);
      if (error) throw error;
      
      document.getElementById('addPromoForm').reset();
      loadPromotions();
    } catch (err) {
      alert(err.message);
    }
  });

  // LOAD PROMOTIONS
  async function loadPromotions() {
    const list = document.getElementById('promotionsList');
    list.innerHTML = 'Loading...';
    const { data, error } = await supabaseClient
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      list.textContent = 'Failed to load.';
      return;
    }

    list.innerHTML = '';
    data.forEach(p => {
      const div = document.createElement('div');
      div.className = 'promotion';
      div.innerHTML = `<strong></strong><p></p>`;
      div.querySelector('strong').textContent = p.title;
      div.querySelector('p').textContent = p.description;
      list.appendChild(div);
    });
  }
});