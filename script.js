const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Auth Elements
    const authModal = document.getElementById('authModal');
    const contributionSection = document.getElementById('contributionSection');
    const userBadge = document.getElementById('userBadge');
    const showAuthBtn = document.getElementById('showAuthBtn');
    
    // Auth Listener
    _supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user;
        if (user) {
            authModal.style.display = 'none';
            showAuthBtn.style.display = 'none';
            userBadge.style.display = 'flex';
            document.getElementById('userEmail').textContent = user.email;
            contributionSection.style.display = 'block';
        } else {
            showAuthBtn.style.display = 'block';
            userBadge.style.display = 'none';
            contributionSection.style.display = 'none';
        }
    });

    // Initial Fetch (Public)
    fetchGlobalPromos();

    // Login/Signup Logic
    document.getElementById('loginBtn').onclick = async () => {
        const { error } = await _supabase.auth.signInWithPassword({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        });
        if (error) alert(error.message);
    };

    document.getElementById('signupBtn').onclick = async () => {
        const { error } = await _supabase.auth.signUp({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        });
        if (error) alert(error.message);
        else alert("Check email if confirmation is enabled!");
    };

    document.getElementById('logoutBtn').onclick = () => _supabase.auth.signOut();

    // Modal Controls
    showAuthBtn.onclick = () => authModal.style.display = 'block';
    document.querySelector('.close').onclick = () => authModal.style.display = 'none';

    // Add Promotion
    document.getElementById('addPromoBtn').onclick = async () => {
        const { data: { user } } = await _supabase.auth.getUser();
        const payload = {
            title: document.getElementById('promoTitle').value,
            description: document.getElementById('promoDesc').value,
            link_url: document.getElementById('promoLink').value,
            image_url: document.getElementById('promoImg').value,
            user_id: user.id
        };

        const { error } = await _supabase.from('promotions').insert([payload]);
        if (error) alert(error.message);
        else {
            location.reload(); // Refresh to show new post
        }
    };

    async function fetchGlobalPromos() {
        const list = document.getElementById('promotionsList');
        const { data, error } = await _supabase
            .from('promotions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return;

        list.innerHTML = data.map(p => `
            <div class="promo-card glass">
                ${p.image_url ? `<img src="${p.image_url}" class="promo-img" alt="space">` : ''}
                <div class="promo-content">
                    <h4>${p.title}</h4>
                    <p>${p.description}</p>
                    <div class="promo-footer">
                        ${p.link_url ? `<a href="${p.link_url}" target="_blank" class="deal-link">View Deal</a>` : ''}
                        <div class="actions">
                            <span>🚀 0</span>
                            <span>💬 0</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
});