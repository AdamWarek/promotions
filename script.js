// Supabase config
const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

// Initialize Supabase
// FIX: Renamed variable to 'supabaseClient' to avoid conflict with the global 'supabase' library object
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('authForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  const messageDiv = document.getElementById('message');

  const promoSection = document.getElementById('promoSection');
  const addPromoForm = document.getElementById('addPromoForm');
  const promoTitle = document.getElementById('promoTitle');
  const promoDesc = document.getElementById('promoDesc');
  const promotionsList = document.getElementById('promotionsList');

  let currentUser = null;

  // ----------------- SIGNUP -----------------
  signupBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent form submit if button is inside form
    messageDiv.textContent = 'Signing up...';
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      if (!email || !password) throw new Error('Email and password required');

      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;

      messageDiv.textContent = 'Signup successful! Please check email or login.';
      messageDiv.style.color = 'green';
    } catch (err) {
      messageDiv.textContent = err.message;
      messageDiv.style.color = 'red';
    }
  });

  // ----------------- LOGIN -----------------
  // Triggered by the Form Submit (Enter key or Login button)
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.textContent = 'Logging in...';
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      if (!email || !password) throw new Error('Email and password required');

      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      currentUser = data.user;

      messageDiv.textContent = 'Logged in successfully!';
      messageDiv.style.color = 'green';

      // Hide Auth form, show Promo section
      authForm.style.display = 'none';
      promoSection.style.display = 'block';

      loadPromotions();
    } catch (err) {
      messageDiv.textContent = err.message;
      messageDiv.style.color = 'red';
    }
  });

  // ----------------- ADD PROMOTION -----------------
  addPromoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!promoTitle.value.trim()) return;

    const submitBtn = document.getElementById('addPromoBtn');
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    try {
      const { data, error } = await supabaseClient.from('promotions').insert([{
        user_id: currentUser.id,
        title: promoTitle.value.trim(),
        description: promoDesc.value.trim()
      }]);
      
      if (error) throw error;

      promoTitle.value = '';
      promoDesc.value = '';
      loadPromotions();
    } catch (err) {
      alert('Error adding promotion: ' + err.message);
    } finally {
      submitBtn.textContent = 'Add Promotion';
      submitBtn.disabled = false;
    }
  });

  // ----------------- LOAD PROMOTIONS -----------------
  async function loadPromotions() {
    promotionsList.innerHTML = 'Loading...';
    try {
      const { data, error } = await supabaseClient
        .from('promotions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      promotionsList.innerHTML = '';
      
      if (data.length === 0) {
        promotionsList.innerHTML = '<p style="text-align:center; color:#666;">No promotions found.</p>';
        return;
      }

      data.forEach(promo => {
        const div = document.createElement('div');
        div.className = 'promotion';
        
        // SECURITY FIX: Use textContent to prevent XSS attacks
        const titleEl = document.createElement('strong');
        titleEl.textContent = promo.title;
        
        const descEl = document.createElement('p');
        descEl.textContent = promo.description || '';

        div.appendChild(titleEl);
        div.appendChild(descEl);
        promotionsList.appendChild(div);
      });
    } catch (err) {
      promotionsList.innerHTML = '<span style="color:red">Error loading promotions</span>';
      console.error(err);
    }
  }
});