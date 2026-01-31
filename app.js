// 1. Initialize Supabase
const supabaseUrl = 'https://isfxqilovpicqwaafkzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnhxaWxvdnBpY3F3YWFma3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDk2NTQsImV4cCI6MjA4NTQyNTY1NH0.V3mTmjcp1wt-PWPMofuUvxVdZ8usO8Q2b0Y2fqQkXxw';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// State
let currentUser = null;
let currentPage = 1;
const itemsPerPage = 5;

// DOM Elements
const authContainer = document.getElementById('authContainer');
const feed = document.getElementById('feed');
const loading = document.getElementById('loading');
const authModal = document.getElementById('authModal');
const promoModal = document.getElementById('promoModal');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

// --- Initialization ---
window.addEventListener('DOMContentLoaded', async () => {
    // Check Login Status
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    updateNav();
    
    // Load Data
    fetchPromotions();

    // Listen for Auth Changes
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateNav();
        fetchPromotions(); // Refresh to update delete buttons/vote states
    });
});

// --- Navigation & Auth UI ---
function updateNav() {
    if (currentUser) {
        authContainer.innerHTML = `
            <span style="margin-right:10px;">${currentUser.email.split('@')[0]}</span>
            <button onclick="handleLogout()" class="btn btn-outline">Logout</button>
        `;
        document.getElementById('addPromoBtn').style.display = 'block';
    } else {
        authContainer.innerHTML = `
            <button onclick="openAuthModal()" class="btn btn-primary">Login / Sign Up</button>
        `;
        document.getElementById('addPromoBtn').style.display = 'none';
    }
}

// --- Data Fetching ---
async function fetchPromotions() {
    loading.style.display = 'block';
    feed.innerHTML = '';

    const sortBy = sortSelect.value;
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Use the View we created in SQL
    let query = supabase
        .from('promotions_with_stats')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: false })
        .range(from, to);

    // Client-side search (Supabase simple text search)
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

// --- Rendering ---
function renderPromotions(promotions) {
    if (promotions.length === 0) {
        feed.innerHTML = '<div style="text-align:center; padding:2rem;">No promotions found in this sector.</div>';
        return;
    }

    promotions.forEach(async (p) => {
        const card = document.createElement('div');
        card.className = 'promo-card';
        
        // Check if current user voted
        let voteClassLike = '';
        let voteClassDislike = '';
        
        if (currentUser) {
            const { data: userVote } = await supabase
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

// --- Actions ---

// Voting
async function handleVote(promoId, type) {
    if (!currentUser) return openAuthModal();

    // Upsert (Insert or Update) Vote
    const { error } = await supabase
        .from('votes')
        .upsert({ 
            user_id: currentUser.id, 
            promotion_id: promoId, 
            vote_type: type 
        }, { onConflict: 'user_id, promotion_id' });

    if (error) console.error(error);
    else fetchPromotions(); // Refresh UI
}

// Delete Promo
async function deletePromo(id) {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (!error) fetchPromotions();
}

// Comments
async function toggleComments(promoId) {
    const section = document.getElementById(`comments-${promoId}`);
    const list = document.getElementById(`list-${promoId}`);
    
    if (section.style.display === 'block') {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    list.innerHTML = 'Loading...';

    const { data } = await supabase
        .from('comments')
        .select('*, profiles:user_id(email)') // We link via auth ID implies just getting ID is enough for now or complex join
        .eq('promotion_id', promoId)
        .order('created_at', { ascending: true });

    list.innerHTML = '';
    data.forEach(c => {
        const isMine = currentUser && currentUser.id === c.user_id;
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `
            <strong>User:</strong> ${c.content}
            ${isMine ? `<i class="fa-solid fa-trash delete-btn" onclick="deleteComment('${c.id}', '${promoId}')"></i>` : ''}
        `;
        list.appendChild(div);
    });
}

async function postComment(promoId) {
    const input = document.getElementById(`input-${promoId}`);
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabase.from('comments').insert({
        user_id: currentUser.id,
        promotion_id: promoId,
        content: content
    });

    if (!error) {
        input.value = '';
        toggleComments(promoId); // Reload
        toggleComments(promoId); // Toggle back open
    }
}

async function deleteComment(commentId, promoId) {
    await supabase.from('comments').delete().eq('id', commentId);
    toggleComments(promoId);
    toggleComments(promoId);
}

// --- Auth & Modals Logic ---
const isLogin = { value: true };

document.getElementById('addPromoBtn').onclick = () => promoModal.style.display = 'flex';
document.getElementById('closePromo').onclick = () => promoModal.style.display = 'none';
document.getElementById('closeAuth').onclick = () => authModal.style.display = 'none';

function openAuthModal() { authModal.style.display = 'flex'; }
async function handleLogout() { await supabase.auth.signOut(); }

document.getElementById('toggleAuthMode').onclick = (e) => {
    e.preventDefault();
    isLogin.value = !isLogin.value;
    document.getElementById('authTitle').innerText = isLogin.value ? 'Login' : 'Sign Up';
    document.getElementById('authSubmit').innerText = isLogin.value ? 'Login' : 'Sign Up';
    document.getElementById('authSwitch').innerHTML = isLogin.value 
        ? `Don't have an account? <a href="#" id="toggleAuthMode">Sign Up</a>`
        : `Have an account? <a href="#" id="toggleAuthMode">Login</a>`;
    // Re-attach listener
    document.getElementById('toggleAuthMode').onclick = arguments.callee;
};

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('authError');
    errorEl.innerText = '';

    let error;
    if (isLogin.value) {
        ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    } else {
        ({ error } = await supabase.auth.signUp({ email, password }));
        if (!error) alert('Check your email for confirmation link!');
    }

    if (error) errorEl.innerText = error.message;
    else authModal.style.display = 'none';
};

// --- Post Promotion Logic ---
document.getElementById('promoForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('postSubmit');
    btn.disabled = true;
    btn.innerText = 'Uploading...';

    const file = document.getElementById('promoImage').files[0];
    const title = document.getElementById('promoTitle').value;
    const desc = document.getElementById('promoDesc').value;
    const link = document.getElementById('promoLink').value;

    // 1. Upload Image
    const fileName = `${Date.now()}-${file.name}`;
    const { data: imgData, error: imgError } = await supabase.storage
        .from('promotion-images')
        .upload(fileName, file);

    if (imgError) {
        document.getElementById('promoError').innerText = 'Image upload failed.';
        btn.disabled = false;
        return;
    }

    const imgUrl = `${supabaseUrl}/storage/v1/object/public/promotion-images/${fileName}`;

    // 2. Insert Data
    const { error: dbError } = await supabase.from('promotions').insert({
        title,
        description: desc,
        link,
        image_url: imgUrl,
        user_id: currentUser.id
    });

    if (dbError) {
        document.getElementById('promoError').innerText = dbError.message;
    } else {
        promoModal.style.display = 'none';
        document.getElementById('promoForm').reset();
        fetchPromotions();
    }
    btn.disabled = false;
    btn.innerText = 'Launch';
};

// Search & Sort Listeners
searchInput.addEventListener('input', () => { currentPage = 1; fetchPromotions(); });
sortSelect.addEventListener('change', () => { currentPage = 1; fetchPromotions(); });
document.getElementById('prevPage').onclick = () => { if (currentPage > 1) { currentPage--; fetchPromotions(); }};
document.getElementById('nextPage').onclick = () => { currentPage++; fetchPromotions(); };

function updatePagination(totalCount) {
    document.getElementById('pageIndicator').innerText = `Page ${currentPage}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = (currentPage * itemsPerPage) >= totalCount;
}

// Close modals on outside click
window.onclick = (e) => {
    if (e.target == authModal) authModal.style.display = "none";
    if (e.target == promoModal) promoModal.style.display = "none";
}