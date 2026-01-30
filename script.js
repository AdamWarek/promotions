const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

// Initialize the client with a unique variable name
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message');
    const authSection = document.getElementById('authSection');
    const promoSection = document.getElementById('promoSection');
    const userDisplay = document.getElementById('userDisplay');
    const promoList = document.getElementById('promotionsList');

    // --- Helper: Update UI based on User ---
    function toggleView(user) {
        if (user) {
            authSection.style.display = 'none';
            promoSection.style.display = 'block';
            userDisplay.textContent = user.email;
            fetchPromos(user.id);
        } else {
            authSection.style.display = 'block';
            promoSection.style.display = 'none';
            messageDiv.textContent = '';
        }
    }

    // --- Auth Listener: Handles login/logout state automatically ---
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth Event:", event);
        toggleView(session?.user || null);
    });

    // --- Sign Up ---
    document.getElementById('signupBtn').onclick = async () => {
        messageDiv.textContent = "Processing...";
        const { data, error } = await _supabase.auth.signUp({
            email: emailInput.value,
            password: passwordInput.value
        });

        if (error) {
            messageDiv.textContent = error.message;
            messageDiv.style.color = "red";
        } else if (data.session === null) {
            messageDiv.textContent = "Check your email inbox for a confirmation link!";
            messageDiv.style.color = "orange";
        }
    };

    // --- Login ---
    document.getElementById('loginBtn').onclick = async () => {
        messageDiv.textContent = "Verifying...";
        const { error } = await _supabase.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value
        });

        if (error) {
            messageDiv.textContent = error.message;
            messageDiv.style.color = "red";
        }
    };

    // --- Logout ---
    document.getElementById('logoutBtn').onclick = async () => {
        await _supabase.auth.signOut();
    };

    // --- Add Promotion ---
    document.getElementById('addPromoBtn').onclick = async () => {
        const title = document.getElementById('promoTitle').value;
        const desc = document.getElementById('promoDesc').value;
        const { data: { user } } = await _supabase.auth.getUser();

        if (!title) return alert("Please enter a title");

        const { error } = await _supabase.from('promotions').insert([
            { title, description: desc, user_id: user.id }
        ]);

        if (error) {
            alert(error.message);
        } else {
            document.getElementById('promoTitle').value = '';
            document.getElementById('promoDesc').value = '';
            fetchPromos(user.id);
        }
    };

    // --- Fetch Promotions ---
    async function fetchPromos(userId) {
        promoList.innerHTML = '<p>Refreshing deals...</p>';
        const { data, error } = await _supabase
            .from('promotions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return promoList.innerHTML = "Error loading list.";
        
        promoList.innerHTML = data.length ? '' : '<p>No promotions added yet.</p>';
        data.forEach(p => {
            const card = document.createElement('div');
            card.className = 'promo-card';
            card.innerHTML = `<strong></strong><p></p>`;
            card.querySelector('strong').textContent = p.title;
            card.querySelector('p').textContent = p.description;
            promoList.appendChild(card);
        });
    }
});