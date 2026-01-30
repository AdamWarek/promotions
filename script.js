// 🔴 REPLACE WITH YOUR SUPABASE DETAILS
const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

// Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  const messageDiv = document.getElementById('message');

  const promoSection = document.getElementById('promoSection');
  const promoTitle = document.getElementById('promoTitle');
  const promoDesc = document.getElementById('promoDesc');
  const addPromoBtn = document.getElementById('addPromoBtn');
  const promotionsList = document.getElementById('promotionsList');

  let currentUser = null;

  // ----------------- AUTH -----------------
  signupBtn.addEventListener('click', async () => {
    messageDiv.textContent = 'Signing up...';
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value
      });
      if (error) throw error;
      messageDiv.textContent = 'Signup successful! Please login.';
      messageDiv.style.color = 'green';
    } catch (err) {
      messageDiv.textContent = err.message;
      messageDiv.style.color = 'red';
    }
  });

  loginBtn.addEventListener('click', async () => {
    messageDiv.textContent = 'Logging in...';
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value
      });
      if (error) throw error;

      currentUser = data.user;
      messageDiv.textContent = 'Logged in successfully!';
      messageDiv.style.color = 'green';

      // Show promotions section
      promoSection.style.display = 'block';
      emailInput.style.display = 'none';
      passwordInput.style.display = 'none';
      signupBtn.style.display = 'none';
      loginBtn.style.display = 'none';

      loadPromotions();
    } catch (err) {
      messageDiv.textContent = err.message;
      messageDiv.style.color = 'red';
    }
  });

  // ----------------- ADD PROMOTION -----------------
  addPromoBtn.addEventListener('click', async () => {
    if (!promoTitle.value) return;

    try {
      const { data, error } = await supabase.from('promotions').insert([{
        user_id: currentUser.id,
        title: promoTitle.value,
        description: promoDesc.value
      }]);
      if (error) throw error;

      promoTitle.value = '';
      promoDesc.value = '';
      loadPromotions();
    } catch (err) {
      alert('Error adding promotion: ' + err.message);
    }
  });

  // ----------------- LOAD PROMOTIONS -----------------
  async function loadPromotions() {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      promotionsList.innerHTML = '';
      data.forEach(promo => {
        const div = document.createElement('div');
        div.className = 'promotion';
        div.innerHTML = `<strong>${promo.title}</strong><p>${promo.description || ''}</p>`;
        promotionsList.appendChild(div);
      });
    } catch (err) {
      promotionsList.innerHTML = 'Error loading promotions';
    }
  }
});
