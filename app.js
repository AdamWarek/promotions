// Configuration
const supabaseUrl = 'https://isfxqilovpicqwaafkzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnhxaWxvdnBpY3F3YWFma3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDk2NTQsImV4cCI6MjA4NTQyNTY1NH0.V3mTmjcp1wt-PWPMofuUvxVdZ8usO8Q2b0Y2fqQkXxw';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// State
let currentUser = null;
let currentCategory = 'all';
let currentSort = 'score';
let currentPage = 0;
const PAGE_SIZE = 5;
let isLoading = false;
let hasMore = true;

// DOM Elements
const feed = document.getElementById('feed');
const sentinel = document.getElementById('scrollSentinel');
const skeletonLoader = document.getElementById('skeletonLoader');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Session
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    updateAuthUI();

    // 2. Initialize Feed
    observer.observe(sentinel); // Triggers loadPosts()

    // 3. Setup Realtime Listener
    supabaseClient.channel('public:promotions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'promotions' }, payload => {
            // Show toast or prepend if it matches filter (Advanced: Check category)
            const toast = document.createElement('div');
            toast.className = 'glass';
            toast.style.cssText = 'position:fixed; bottom:80px; right:20px; padding:15px; background:var(--primary); color:white; border-radius:8px; z-index:1000; animation: fadein 0.5s;';
            toast.textContent = `New Signal: ${payload.new.title}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        })
        .subscribe();
});

// --- Infinite Scroll ---
const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
        await loadPosts();
    }
});

async function loadPosts() {
    isLoading = true;
    if (currentPage === 0) skeletonLoader.style.display = 'flex'; // Show skeleton on first load

    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabaseClient
        .from('promotions_with_stats')
        .select('*')
        .order(currentSort, { ascending: false })
        .range(from, to);

    if (currentCategory !== 'all') {
        query = query.eq('category', currentCategory);
    }

    const { data, error } = await query;
    skeletonLoader.style.display = 'none';

    if (error) {
        console.error(error);
        return;
    }

    if (data.length < PAGE_SIZE) {
        hasMore = false;
        sentinel.textContent = "End of Transmission.";
    }

    renderPosts(data);
    currentPage++;
    isLoading = false;
}

// --- Anti-XSS Rendering ---
function renderPosts(posts) {
    posts.forEach(p => {
        // Create container
        const card = document.createElement('div');
        card.className = 'promo-card glass';
        card.id = `post-${p.id}`;

        // Safe Image
        const img = document.createElement('img');
        img.className = 'promo-img';
        img.src = p.image_url;
        img.onerror = () => img.src = 'https://via.placeholder.com/200x200?text=No+Signal'; // Fallback

        // Content Container
        const content = document.createElement('div');
        content.className = 'promo-content';

        // Category Tag
        const tag = document.createElement('span');
        tag.className = 'promo-tag';
        tag.textContent = p.category || 'General';

        // Safe Title
        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = p.title; // Safe: textContent escapes HTML
        
        // Link wrapper for title
        const link = document.createElement('a');
        link.href = p.link;
        link.target = '_blank';
        link.style.textDecoration = 'none';
        link.appendChild(title);

        // Safe Description
        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = p.description;

        // Meta Row
        const actions = document.createElement('div');
        actions.className = 'actions-row';
        actions.innerHTML = `
            <span class="action-btn" onclick="openComments('${p.id}')">
                <i class="fa-regular fa-comment"></i> ${p.comment_count}
            </span>
            <span class="action-btn" onclick="toggleBookmark('${p.id}', this)">
                <i class="fa-regular fa-bookmark"></i> Save
            </span>
            <span><i class="fa-regular fa-eye"></i> ${p.views || 0}</span>
        `;

        // Vote Section
        const voteBox = document.createElement('div');
        voteBox.className = 'vote-section';
        voteBox.innerHTML = `
            <i class="fa-solid fa-chevron-up vote-arrow up" onclick="handleVote('${p.id}', 1, this)"></i>
            <span class="score">${p.score}</span>
            <i class="fa-solid fa-chevron-down vote-arrow down" onclick="handleVote('${p.id}', -1, this)"></i>
        `;

        // Assembly
        content.append(tag, link, desc, actions);
        card.append(img, content, voteBox);
        feed.appendChild(card);
    });
}

// --- Filtering ---
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update UI
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Reset Feed
        currentCategory = btn.dataset.cat;
        currentPage = 0;
        hasMore = true;
        feed.innerHTML = '';
        sentinel.textContent = 'Loading...';
        loadPosts();
    });
});

document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 0;
    hasMore = true;
    feed.innerHTML = '';
    loadPosts();
});

// --- Actions ---
window.handleVote = async (id, type, el) => {
    if (!currentUser) return document.getElementById('authModal').style.display = 'flex';
    
    // Optimistic UI Update (Gamification feel)
    const scoreEl = el.parentElement.querySelector('.score');
    let current = parseInt(scoreEl.textContent);
    scoreEl.textContent = current + type;

    const { error } = await supabaseClient
        .from('votes')
        .upsert({ user_id: currentUser.id, promotion_id: id, vote_type: type }, { onConflict: 'user_id, promotion_id' });
        
    if (error) scoreEl.textContent = current; // Revert on error
};

window.openComments = async (id) => {
    const modal = document.getElementById('commentsModal');
    const list = document.getElementById('commentsList');
    modal.style.display = 'flex';
    list.innerHTML = '<p style="text-align:center; color:#888;">Decrypting transmissions...</p>';
    
    // Fetch comments
    const { data } = await supabaseClient
        .from('comments')
        .select('*')
        .eq('promotion_id', id)
        .order('created_at', { ascending: true });
        
    list.innerHTML = '';
    data.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        // Security: Prevent XSS in comments
        div.textContent = c.content; 
        list.appendChild(div);
    });

    // Handle Send
    document.getElementById('sendCommentBtn').onclick = async () => {
        const input = document.getElementById('commentInput');
        if (!input.value.trim()) return;
        
        await supabaseClient.from('comments').insert({
            user_id: currentUser?.id,
            promotion_id: id,
            content: input.value
        });
        
        // Append locally immediately
        const temp = document.createElement('div');
        temp.className = 'comment-item';
        temp.textContent = input.value;
        list.appendChild(temp);
        input.value = '';
    };
};

window.toggleBookmark = async (id, btn) => {
    if (!currentUser) return alert("Login required");
    btn.classList.toggle('bookmark-active');
    
    // Check if exists
    const { data } = await supabaseClient.from('bookmarks').select('*').eq('user_id', currentUser.id).eq('promo_id', id);
    
    if (data.length > 0) {
        await supabaseClient.from('bookmarks').delete().eq('user_id', currentUser.id).eq('promo_id', id);
    } else {
        await supabaseClient.from('bookmarks').insert({ user_id: currentUser.id, promo_id: id });
    }
};

// --- Auth & Profile ---
function updateAuthUI() {
    const btn = document.getElementById('desktopLoginBtn');
    const profile = document.getElementById('userProfile');
    
    if (currentUser) {
        btn.style.display = 'none';
        profile.style.display = 'flex';
        document.getElementById('userEmail').textContent = currentUser.email.split('@')[0];
        document.getElementById('addPromoBtn').style.display = 'block';
        document.getElementById('mobileAddBtn').onclick = () => document.getElementById('promoModal').style.display = 'flex';
        fetchUserRank();
    } else {
        btn.style.display = 'block';
        profile.style.display = 'none';
        document.getElementById('mobileAddBtn').onclick = () => alert("Login required");
    }
}

async function fetchUserRank() {
    const { data } = await supabaseClient.from('user_ranks').select('total_karma').eq('user_id', currentUser.id).single();
    const karma = data?.total_karma || 0;
    const badge = document.getElementById('userRank');
    
    if (karma > 50) badge.textContent = "Galaxy Master";
    else if (karma > 10) badge.textContent = "Explorer";
    else badge.textContent = "Cadet";
}

// --- Upload Logic ---
document.getElementById('promoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('postSubmit');
    btn.textContent = 'Uploading...';
    btn.disabled = true;

    // Image Upload
    const file = document.getElementById('promoImage').files[0];
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '')}`;
    const { error: uploadError } = await supabaseClient.storage.from('promotion-images').upload(fileName, file);

    if (uploadError) {
        alert("Upload Failed");
        btn.disabled = false;
        return;
    }

    const imgUrl = `${supabaseUrl}/storage/v1/object/public/promotion-images/${fileName}`;

    // Database Insert
    const { error } = await supabaseClient.from('promotions').insert({
        title: document.getElementById('promoTitle').value,
        description: document.getElementById('promoDesc').value,
        link: document.getElementById('promoLink').value,
        category: document.getElementById('promoCategory').value,
        image_url: imgUrl,
        user_id: currentUser.id
    });

    if (!error) {
        document.getElementById('promoModal').style.display = 'none';
        // Reset feed to show new post at top
        currentPage = 0;
        feed.innerHTML = '';
        hasMore = true;
        loadPosts();
    }
    
    btn.disabled = false;
    btn.textContent = 'Launch';
});

// Modal Toggles
const closeModal = (id) => document.getElementById(id).style.display = 'none';
document.getElementById('closeAuth').onclick = () => closeModal('authModal');
document.getElementById('closePromo').onclick = () => closeModal('promoModal');
document.getElementById('closeComments').onclick = () => closeModal('commentsModal');
document.getElementById('desktopLoginBtn').onclick = () => document.getElementById('authModal').style.display = 'flex';
document.getElementById('mobileProfileBtn').onclick = () => document.getElementById('authModal').style.display = 'flex';
document.getElementById('logoutBtn').onclick = async () => { await supabaseClient.auth.signOut(); location.reload(); };