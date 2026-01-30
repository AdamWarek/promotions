const SUPABASE_URL = 'https://jlzpqxdaeuqtvbvvaodt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsenBxeGRhZXVxdHZidnZhb2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjM1NTYsImV4cCI6MjA4NTI5OTU1Nn0.QC_KZHSX2mrnRzPMP3HJ5h9yX6TOR9FPICknnApE4lQ';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let activePromoId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchGlobalPromos();

    _supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user;
        document.getElementById('userBadge').style.display = user ? 'flex' : 'none';
        document.getElementById('showAuthBtn').style.display = user ? 'none' : 'block';
        document.getElementById('contributionSection').style.display = user ? 'block' : 'none';
        document.getElementById('commentInputArea').style.display = user ? 'block' : 'none';
        if(user) document.getElementById('userEmail').textContent = user.email;
    });

    // --- AUTH ---
    document.getElementById('loginBtn').onclick = async () => {
        await _supabase.auth.signInWithPassword({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        });
    };

    document.getElementById('showAuthBtn').onclick = () => document.getElementById('authModal').style.display = 'block';

    // --- FEED LOGIC ---
    async function fetchGlobalPromos() {
        const list = document.getElementById('promotionsList');
        const { data, error } = await _supabase.from('v_promotions_feed').select('*').order('created_at', { ascending: false });

        if (error) return console.error(error);

        list.innerHTML = data.map(p => `
            <div class="promo-card glass">
                ${p.image_url ? `<img src="${p.image_url}" class="promo-img">` : ''}
                <div class="promo-content">
                    <h4>${p.title}</h4>
                    <p>${p.description}</p>
                    <div class="promo-footer">
                        <button onclick="vote('${p.id}')">🚀 ${p.vote_count}</button>
                        <button onclick="openComments('${p.id}', '${p.title}')">💬 ${p.comment_count}</button>
                        ${p.link_url ? `<a href="${p.link_url}" target="_blank" class="deal-link">Visit</a>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // --- VOTING ---
    window.vote = async (promoId) => {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return alert("Login to vote!");

        const { error } = await _supabase.from('votes').insert([{ promo_id: promoId, user_id: user.id }]);
        if (error) {
            // If already voted, remove vote
            await _supabase.from('votes').delete().eq('promo_id', promoId).eq('user_id', user.id);
        }
        fetchGlobalPromos();
    };

    // --- COMMENTS ---
    window.openComments = async (id, title) => {
        activePromoId = id;
        document.getElementById('modalTitle').textContent = `Comments: ${title}`;
        document.getElementById('commentModal').style.display = 'block';
        renderComments();
    };

    async function renderComments() {
        const container = document.getElementById('commentsContainer');
        const { data } = await _supabase.from('comments').select('*').eq('promo_id', activePromoId).order('created_at', { ascending: true });
        
        container.innerHTML = data.map(c => `
            <div class="comment">
                <small>${c.user_email.split('@')[0]}</small>
                <p>${c.content}</p>
            </div>
        `).join('');
    }

    document.getElementById('postCommentBtn').onclick = async () => {
        const text = document.getElementById('newCommentText').value;
        const { data: { user } } = await _supabase.auth.getUser();
        if(!text) return;

        await _supabase.from('comments').insert([{ 
            content: text, 
            promo_id: activePromoId, 
            user_id: user.id,
            user_email: user.email
        }]);
        document.getElementById('newCommentText').value = '';
        renderComments();
        fetchGlobalPromos();
    };

    window.closeModal = (id) => document.getElementById(id).style.display = 'none';
});