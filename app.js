// --- CONFIGURATION ---
const supabaseUrl = 'https://isfxqilovpicqwaafkzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnhxaWxvdnBpY3F3YWFma3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDk2NTQsImV4cCI6MjA4NTQyNTY1NH0.V3mTmjcp1wt-PWPMofuUvxVdZ8usO8Q2b0Y2fqQkXxw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- STATE ---
let currentUser = null;
let currentCategory = 'all';
let isSignup = false;
let searchTimer = null; // For debounce

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Session
    const { data: { session } } = await supabaseClient.auth.getSession();
    handleUserChange(session?.user);

    // 2. Auth Listener (Login/Logout updates)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        handleUserChange(session?.user);
    });

    // 3. Initial Load
    loadPosts();

    // 4. Setup Event Listeners
    setupListeners();
});

function handleUserChange(user) {
    currentUser = user || null;
    const desktopBtn = document.getElementById('desktopLoginBtn');
    const profile = document.getElementById('userProfile');
    const addBtn = document.getElementById('addPromoBtn');

    if (currentUser) {
        desktopBtn.style.display = 'none';
        profile.style.display = 'flex';
        document.getElementById('userEmail').textContent = user.email.split('@')[0];
        addBtn.style.display = 'block';
    } else {
        desktopBtn.style.display = 'block';
        profile.style.display = 'none';
        addBtn.style.display = 'none';
    }
}

// --- DATA FETCHING (SEARCH FIXED) ---
async function loadPosts() {
    const feed = document.getElementById('feed');
    const loading = document.getElementById('loadingIndicator');
    const searchTerm = document.getElementById('searchInput').value.trim();
    const sortBy = document.getElementById('sortSelect').value;

    feed.innerHTML = '';
    loading.style.display = 'block';

    // Start building query
    let query = supabaseClient
        .from('promotions_with_stats') // Use the view we created in SQL
        .select('*')
        .order(sortBy, { ascending: false });

    // Apply Filter
    if (currentCategory !== 'all') {
        query = query.eq('category', currentCategory);
    }

    // Apply Search (FIXED: Using ilike properly)
    if (searchTerm) {
        // syntax: column.ilike.%value%
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    loading.style.display = 'none';

    if (error) {
        console.error("Fetch error:", error);
        feed.innerHTML = `<p style="text-align:center; color:red">Error loading data. ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        feed.innerHTML = '<p style="text-align:center; color:#888;">No transmissions found in this sector.</p>';
        return;
    }

    renderCards(data);
}

function renderCards(posts) {
    const feed = document.getElementById('feed');
    posts.forEach(p => {
        const card = document.createElement('div');
        card.className = 'promo-card glass';
        
        // Handle Missing Images
        const imgDisplay = p.image_url ? `<img src="${p.image_url}" class="promo-img">` : '';

        card.innerHTML = `
            ${imgDisplay}
            <div class="promo-content">
                <span class="promo-tag">${p.category}</span>
                <a href="${p.link}" target="_blank" style="text-decoration:none;">
                    <h3 class="card-title">${escapeHtml(p.title)}</h3>
                </a>
                <p class="card-desc">${escapeHtml(p.description)}</p>
                <div class="actions-row">
                    <span><i class="fa-solid fa-star"></i> ${p.score || 0} Points</span>
                    <span><i class="fa-solid fa-comment"></i> ${p.comment_count || 0} Comments</span>
                </div>
            </div>
            <div class="vote-section">
                <i class="fa-solid fa-arrow-up vote-arrow" onclick="vote('${p.id}', 1)"></i>
                <span class="score">${p.score || 0}</span>
                <i class="fa-solid fa-arrow-down vote-arrow" onclick="vote('${p.id}', -1)"></i>
            </div>
        `;
        feed.appendChild(card);
    });
}

// --- CREATE PROMO (FIXED) ---
async function handleCreate(e) {
    e.preventDefault();
    const btn = document.getElementById('postSubmitBtn');
    btn.textContent = 'Uploading...';
    btn.disabled = true;

    try {
        if (!currentUser) throw new Error("You must be logged in.");

        const fileInput = document.getElementById('promoImage');
        let publicUrl = null;

        // 1. Upload Image (If exists)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name.replace(/\s/g, '')}`;
            
            // Upload to Supabase Storage
            const { error: uploadErr } = await supabaseClient.storage
                .from('promotion-images')
                .upload(fileName, file);

            if (uploadErr) throw new Error("Image Upload Failed: " + uploadErr.message);

            // Get Public URL
            const { data: urlData } = supabaseClient.storage
                .from('promotion-images')
                .getPublicUrl(fileName);
            
            publicUrl = urlData.publicUrl;
        }

        // 2. Insert Record
        const { error: dbError } = await supabaseClient.from('promotions').insert({
            title: document.getElementById('promoTitle').value,
            description: document.getElementById('promoDesc').value,
            link: document.getElementById('promoLink').value,
            category: document.getElementById('promoCategory').value,
            image_url: publicUrl,
            user_id: currentUser.id
        });

        if (dbError) throw dbError;

        // Success
        document.getElementById('promoModal').style.display = 'none';
        document.getElementById('promoForm').reset();
        loadPosts(); // Refresh feed
        alert("Transmission Sent!");

    } catch (err) {
        alert(err.message);
        console.error(err);
    } finally {
        btn.textContent = 'Launch';
        btn.disabled = false;
    }
}

// --- AUTH HANDLERS ---
async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const msg = document.getElementById('authMsg');

    msg.textContent = "Processing...";
    msg.style.color = "#00f3ff";

    let result;
    if (isSignup) {
        result = await supabaseClient.auth.signUp({ email, password });
    } else {
        result = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
        msg.textContent = result.error.message;
        msg.style.color = "red";
    } else {
        if (isSignup && !result.data.session) {
             msg.textContent = "Success! Check your email to confirm.";
             msg.style.color = "orange";
        } else {
             // Successful login
             document.getElementById('authModal').style.display = 'none';
             loadPosts();
        }
    }
}

// --- GLOBAL VOTING ---
window.vote = async (promoId, type) => {
    if (!currentUser) return alert("Login to vote!");
    // Upsert vote (Insert or Update)
    const { error } = await supabaseClient
        .from('votes')
        .upsert({ 
            user_id: currentUser.id, 
            promotion_id: promoId, 
            vote_type: type 
        }, { onConflict: 'user_id, promotion_id' });

    if (!error) loadPosts(); // Refresh to see new score
};

// --- LISTENERS SETUP ---
function setupListeners() {
    // Auth Modal Toggles
    document.getElementById('desktopLoginBtn').onclick = () => document.getElementById('authModal').style.display = 'flex';
    document.getElementById('mobileProfileBtn').onclick = () => document.getElementById('authModal').style.display = 'flex';
    document.getElementById('closeAuth').onclick = () => document.getElementById('authModal').style.display = 'none';
    
    // Auth Form Submit
    document.getElementById('authForm').onsubmit = handleAuth;
    document.getElementById('toggleAuthMode').onclick = (e) => {
        e.preventDefault();
        isSignup = !isSignup;
        document.getElementById('authTitle').textContent = isSignup ? "Sign Up" : "Login";
        e.target.textContent = isSignup ? "Switch to Login" : "Switch to Sign Up";
    };

    // Promo Modal Toggles
    document.getElementById('addPromoBtn').onclick = () => document.getElementById('promoModal').style.display = 'flex';
    document.getElementById('mobileAddBtn').onclick = () => {
        if(currentUser) document.getElementById('promoModal').style.display = 'flex';
        else alert("Login required");
    };
    document.getElementById('closePromo').onclick = () => document.getElementById('promoModal').style.display = 'none';
    
    // Promo Form Submit
    document.getElementById('promoForm').onsubmit = handleCreate;

    // Logout
    document.getElementById('logoutBtn').onclick = async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    };

    // Category Filter
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            loadPosts();
        };
    });

    // Search (Debounced)
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            loadPosts();
        }, 500); // Wait 500ms after typing stops
    });

    // Sort Change
    document.getElementById('sortSelect').onchange = loadPosts;
}

// Helper to prevent XSS
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}