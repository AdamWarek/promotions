// 1. Initialize Supabase
const supabaseUrl = 'https://isfxqilovpicqwaafkzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnhxaWxvdnBpY3F3YWFma3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDk2NTQsImV4cCI6MjA4NTQyNTY1NH0.V3mTmjcp1wt-PWPMofuUvxVdZ8usO8Q2b0Y2fqQkXxw';

// FIX: We name this 'supabaseClient' instead of 'supabase' to avoid conflict
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// State
let currentUser = null;
let currentPage = 1;
let isLoginMode = true; 
const itemsPerPage = 5;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userProfile = document.getElementById('userProfile');
const userEmailSpan = document.getElementById('userEmail');
const authModal = document.getElementById('authModal');
const promoModal = document.getElementById('promoModal');
const feed = document.getElementById('feed');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
const addPromoBtn = document.getElementById('addPromoBtn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("App initialized");

    // Check Login Status
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    updateNav();
    
    // Load Data
    fetchPromotions();

    // Listen for Auth Changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log("Auth changed:", event);
        currentUser = session?.user || null;
        updateNav();
        fetchPromotions(); 
    });
});

// --- UI Logic ---
function updateNav() {
    if (currentUser) {
        // Show Profile, Hide Login Button
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        userEmailSpan.innerText = currentUser.email.split('@')[0];
        addPromoBtn.style.display = 'block';
    } else {
        // Show Login Button, Hide Profile
        loginBtn.style.display = 'block';
        userProfile.style.display = 'none';
        addPromoBtn.style.display = 'none';
    }
}

// --- Event Listeners ---

// 1. Open Auth Modal
if(loginBtn) {
    loginBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
        isLoginMode = true;
        updateAuthUI();
    });
}

// 2. Logout
if(logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    });
}

// 3. Close Modals
document.getElementById('closeAuth').addEventListener('click', () => {
    authModal.style.display = 'none';
});
document.getElementById('closePromo').addEventListener('click', () => {
    promoModal.style.display = 'none';
});

// 4. Open Add Promo Modal
if(addPromoBtn) {
    addPromoBtn.addEventListener('click', () => {
        promoModal.style.display = 'flex';
    });
}

// 5. Toggle Login/Sign Up
toggleAuthModeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    updateAuthUI();
});

// 6. Handle Auth Form Submit
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('authError');
    errorEl.innerText = 'Processing...';

    let error;
    if (isLoginMode) {
        ({ error } = await supabaseClient.auth.signInWithPassword({ email, password }));
    } else {
        ({ error } = await supabaseClient.auth.signUp({ email, password }));
        if (!error) {
            alert('Sign up successful! Please check your email to confirm your account.');
            isLoginMode = true;
            updateAuthUI();
            return;
        }
    }

    if (error) {
        errorEl.innerText = error.message;
    } else {
        authModal.style.display = 'none';
        errorEl.innerText = '';
        document.getElementById('authForm').reset();
    }
});

function updateAuthUI() {
    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmit');
    const switchText = document.getElementById('authSwitchText');
    const errorEl = document.getElementById('authError');

    errorEl.innerText = ''; 

    if (isLoginMode) {
        title.innerText = 'Login';
        submitBtn.innerText = 'Login';
        switchText.innerText = "Don't have an account?";
        toggleAuthModeBtn.innerText = "Create New Account";
    } else {
        title.innerText = 'Sign Up';
        submitBtn.innerText = 'Sign Up';
        switchText.innerText = "Already have an account?";
        toggleAuthModeBtn.innerText = "Back to Login";
    }
}

// --- Data & Logic ---

async function fetchPromotions() {
    loading.style.display = 'block';
    feed.innerHTML = '';

    const sortBy = sortSelect.value;
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabaseClient
        .from('promotions_with_stats')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: false })
        .range(from, to);

    if (searchInput.value.trim()) {
        const term = searchInput.value.trim();
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('Error:', error);
        loading.innerHTML = 'Error loading cosmic data.';
        return;
    }

    loading.style.display = 'none';
    renderPromotions(data);
    updatePagination(count);
}

function renderPromotions(promotions) {
    if (!promotions || promotions.length === 0) {
        feed.innerHTML = '<div style="text-align:center; padding:2rem;">No promotions found in this sector.</div>';
        return;
    }

    promotions.forEach(async (p) => {
        const card = document.createElement('div');
        card.className = 'promo-card';
        
        let voteClassLike = '';
        let voteClassDislike = '';
        
        if (currentUser) {
            const { data: userVote } = await supabaseClient
                .from('votes')
                .select('vote_type')
                .eq('user_id', currentUser.id)
                .eq('promotion_id', p.id)
                .single();
            
            if (userVote?.vote_type === 1) voteClassLike = 'active';
            if (userVote?.vote_type === -1) voteClassDislike = 'active';
        }

        const deleteBtn = (currentUser && currentUser.id === p.user_id) 
            ? `<button onclick="deletePromo('${p.id}')" style="color:#ff4444; border:none; background:none; cursor:pointer; float:right;">Delete</button>` 
            : '';

        card.innerHTML = `
            <img src="${p.image_url}" class="promo-img" alt="Promo">
            <div class="promo-content">
                ${deleteBtn}
                <a href="${p.link}" target="_blank" class="promo-title">${p.title} <i class="fa-solid fa-external-link-alt"></i></a>
                <p class="promo-desc">${p.description}</p>
                <div class="promo-meta">
                    <span>${new Date(p.created_at).toLocaleDateString()}</span> • 
                    <span style="cursor:pointer; color:var(--accent)" onclick="toggleComments('${p.id}')">
                        ${p.comment_count} Comments
                    </span>
                </div>
                <div id="comments-${p.id}" class="comments-section">
                    <div id="list-${p.id}"></div>
                    ${currentUser ? `
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <input type="text" id="input-${p.id}" placeholder="Write a comment..." style="flex:1; background:#000; border:1px solid #333; color:white; padding:5px;">
                        <button onclick="postComment('${p.id}')" class="btn btn-primary" style="padding:5px 10px;">Send</button>
                    </div>` : '<small>Login to comment</small>'}
                </div>
            </div>
            <div class="vote-section">
                <button class="vote-btn ${voteClassLike}" onclick="handleVote('${p.id}', 1)">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>
                <span class="score">${p.score}</span>
                <button class="vote-btn ${voteClassDislike}" onclick="handleVote('${p.id}', -1)">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
        `;
        feed.appendChild(card);
    });
}

// --- Global Functions (needed for inline onclicks in generated HTML) ---
window.handleVote = async (promoId, type) => {
    if (!currentUser) {
        authModal.style.display = 'flex'; // Trigger modal if not logged in
        return;
    }
    const { error } = await supabaseClient
        .from('votes')
        .upsert({ user_id: currentUser.id, promotion_id: promoId, vote_type: type }, { onConflict: 'user_id, promotion_id' });
    if (!error) fetchPromotions();
};

window.deletePromo = async (id) => {
    if (!confirm('Are you sure?')) return;
    const { error } = await supabaseClient.from('promotions').delete().eq('id', id);
    if (!error) fetchPromotions();
};

window.toggleComments = async (promoId) => {
    const section = document.getElementById(`comments-${promoId}`);
    const list = document.getElementById(`list-${promoId}`);
    if (section.style.display === 'block') { section.style.display = 'none'; return; }
    
    section.style.display = 'block';
    list.innerHTML = 'Loading...';

    const { data } = await supabaseClient.from('comments').select('*').eq('promotion_id', promoId).order('created_at', { ascending: true });
    list.innerHTML = '';
    data.forEach(c => {
        const isMine = currentUser && currentUser.id === c.user_id;
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `${c.content} ${isMine ? `<i class="fa-solid fa-trash delete-btn" onclick="deleteComment('${c.id}', '${promoId}')"></i>` : ''}`;
        list.appendChild(div);
    });
};

window.postComment = async (promoId) => {
    const input = document.getElementById(`input-${promoId}`);
    const content = input.value.trim();
    if (!content) return;
    const { error } = await supabaseClient.from('comments').insert({ user_id: currentUser.id, promotion_id: promoId, content: content });
    if (!error) { input.value = ''; window.toggleComments(promoId); window.toggleComments(promoId); }
};

window.deleteComment = async (commentId, promoId) => {
    await supabaseClient.from('comments').delete().eq('id', commentId);
    window.toggleComments(promoId); window.toggleComments(promoId);
};

// --- Promo Post Logic ---
document.getElementById('promoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('postSubmit');
    btn.disabled = true; btn.innerText = 'Uploading...';

    const file = document.getElementById('promoImage').files[0];
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`; 
    const { error: imgError } = await supabaseClient.storage.from('promotion-images').upload(fileName, file);

    if (imgError) {
        document.getElementById('promoError').innerText = 'Image upload failed: ' + imgError.message;
        btn.disabled = false; return;
    }

    const imgUrl = `${supabaseUrl}/storage/v1/object/public/promotion-images/${fileName}`;
    const { error: dbError } = await supabaseClient.from('promotions').insert({
        title: document.getElementById('promoTitle').value,
        description: document.getElementById('promoDesc').value,
        link: document.getElementById('promoLink').value,
        image_url: imgUrl,
        user_id: currentUser.id
    });

    if (dbError) document.getElementById('promoError').innerText = dbError.message;
    else {
        promoModal.style.display = 'none';
        document.getElementById('promoForm').reset();
        fetchPromotions();
    }
    btn.disabled = false; btn.innerText = 'Launch';
});

// Search/Pagination Listeners
searchInput.addEventListener('input', () => { currentPage = 1; fetchPromotions(); });
sortSelect.addEventListener('change', () => { currentPage = 1; fetchPromotions(); });
document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; fetchPromotions(); }});
document.getElementById('nextPage').addEventListener('click', () => { currentPage++; fetchPromotions(); });

// Close on outside click
window.onclick = (e) => {
    if (e.target == authModal) authModal.style.display = "none";
    if (e.target == promoModal) promoModal.style.display = "none";
}