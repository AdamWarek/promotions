// Global state
let currentUser = null;
let currentPromotions = [];
let userVotes = new Map();

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const signupBtn = document.getElementById('signup-btn');
const closeModal = document.querySelector('.close');
const addPromoSection = document.getElementById('add-promo-section');
const promoForm = document.getElementById('promo-form');
const promotionsList = document.getElementById('promotions-list');
const sortSelect = document.getElementById('sort-select');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkUser();
    await loadPromotions();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', () => {
        authModal.style.display = 'block';
    });

    logoutBtn.addEventListener('click', handleLogout);

    closeModal.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    authForm.addEventListener('submit', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    promoForm.addEventListener('submit', handleAddPromotion);
    sortSelect.addEventListener('change', loadPromotions);
}

// Check if user is logged in
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        currentUser = user;
        updateUIForLoggedInUser();
        await loadUserVotes();
    } else {
        updateUIForLoggedOutUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    userEmailSpan.textContent = currentUser.email;
    addPromoSection.style.display = 'block';
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    loginBtn.style.display = 'block';
    userInfo.style.display = 'none';
    addPromoSection.style.display = 'none';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert('Login failed: ' + error.message);
    } else {
        currentUser = data.user;
        authModal.style.display = 'none';
        updateUIForLoggedInUser();
        await loadUserVotes();
        await loadPromotions();
        authForm.reset();
    }
}

// Handle signup
async function handleSignup() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        alert('Signup failed: ' + error.message);
    } else {
        alert('Signup successful! Please check your email to verify your account.');
        authForm.reset();
    }
}

// Handle logout
async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    userVotes.clear();
    updateUIForLoggedOutUser();
    await loadPromotions();
}

// Load user votes
async function loadUserVotes() {
    if (!currentUser) return;

    const { data, error } = await supabase
        .from('votes')
        .select('promotion_id')
        .eq('user_id', currentUser.id);

    if (!error && data) {
        userVotes.clear();
        data.forEach(vote => {
            userVotes.set(vote.promotion_id, true);
        });
    }
}

// Handle add promotion
async function handleAddPromotion(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please log in to add promotions');
        return;
    }

    const title = document.getElementById('promo-title').value;
    const description = document.getElementById('promo-description').value;
    const link = document.getElementById('promo-link').value;
    const store = document.getElementById('promo-store').value;

    const { data, error } = await supabase
        .from('promotions')
        .insert([
            {
                title,
                description,
                link: link || null,
                store,
                user_id: currentUser.id
            }
        ]);

    if (error) {
        alert('Error adding promotion: ' + error.message);
    } else {
        promoForm.reset();
        await loadPromotions();
        alert('Promotion added successfully!');
    }
}

// Load promotions
async function loadPromotions() {
    const sortBy = sortSelect.value;
    let query = supabase
        .from('promotions')
        .select(`
            *,
            votes:votes(count),
            comments:comments(count)
        `);

    // Apply sorting
    if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
        promotionsList.innerHTML = '<div class="card">Error loading promotions</div>';
        return;
    }

    currentPromotions = data;

    // Sort by popularity if needed
    if (sortBy === 'popular') {
        currentPromotions.sort((a, b) => {
            const aVotes = a.votes[0]?.count || 0;
            const bVotes = b.votes[0]?.count || 0;
            return bVotes - aVotes;
        });
    }

    renderPromotions();
}

// Render promotions
function renderPromotions() {
    if (currentPromotions.length === 0) {
        promotionsList.innerHTML = '<div class="card">No promotions yet. Be the first to add one!</div>';
        return;
    }

    promotionsList.innerHTML = currentPromotions.map(promo => {
        const voteCount = promo.votes[0]?.count || 0;
        const commentCount = promo.comments[0]?.count || 0;
        const hasVoted = userVotes.has(promo.id);
        const createdDate = new Date(promo.created_at).toLocaleDateString();

        return `
            <div class="promotion-card" data-id="${promo.id}">
                <div class="promo-header">
                    <div>
                        <h3 class="promo-title">${escapeHtml(promo.title)}</h3>
                        <span class="promo-store">${escapeHtml(promo.store)}</span>
                    </div>
                </div>
                <div class="promo-meta">Posted on ${createdDate}</div>
                <p class="promo-description">${escapeHtml(promo.description)}</p>
                ${promo.link ? `<a href="${escapeHtml(promo.link)}" target="_blank" rel="noopener noreferrer" class="promo-link">View Promotion →</a>` : ''}
                <div class="promo-actions">
                    <div class="vote-section">
                        <button class="vote-btn ${hasVoted ? 'voted' : ''}" onclick="handleVote('${promo.id}')" ${!currentUser ? 'disabled' : ''}>
                            ${hasVoted ? '👍' : '👍'}
                        </button>
                        <span class="vote-count">${voteCount}</span>
                    </div>
                    <button class="comment-btn" onclick="toggleComments('${promo.id}')">
                        💬 ${commentCount} Comments
                    </button>
                </div>
                <div class="comments-section" id="comments-${promo.id}" style="display: none;">
                    <div class="comment-form" style="display: ${currentUser ? 'block' : 'none'}">
                        <textarea id="comment-text-${promo.id}" placeholder="Add a comment..." rows="2"></textarea>
                        <button class="btn btn-small btn-primary" onclick="handleAddComment('${promo.id}')">Post Comment</button>
                    </div>
                    <div id="comments-list-${promo.id}">
                        Loading comments...
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Handle vote
async function handleVote(promotionId) {
    if (!currentUser) {
        alert('Please log in to vote');
        return;
    }

    const hasVoted = userVotes.has(promotionId);

    if (hasVoted) {
        // Remove vote
        const { error } = await supabase
            .from('votes')
            .delete()
            .eq('promotion_id', promotionId)
            .eq('user_id', currentUser.id);

        if (!error) {
            userVotes.delete(promotionId);
        }
    } else {
        // Add vote
        const { error } = await supabase
            .from('votes')
            .insert([
                {
                    promotion_id: promotionId,
                    user_id: currentUser.id
                }
            ]);

        if (!error) {
            userVotes.set(promotionId, true);
        }
    }

    await loadPromotions();
}

// Toggle comments
async function toggleComments(promotionId) {
    const commentsSection = document.getElementById(`comments-${promotionId}`);
    
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        await loadComments(promotionId);
    } else {
        commentsSection.style.display = 'none';
    }
}

// Load comments
async function loadComments(promotionId) {
    const commentsList = document.getElementById(`comments-list-${promotionId}`);

    const { data, error } = await supabase
        .from('comments')
        .select('*, user_email')
        .eq('promotion_id', promotionId)
        .order('created_at', { ascending: false });

    if (error) {
        commentsList.innerHTML = '<p>Error loading comments</p>';
        return;
    }

    if (data.length === 0) {
        commentsList.innerHTML = '<p style="color: #888; font-style: italic;">No comments yet. Be the first to comment!</p>';
        return;
    }

    commentsList.innerHTML = data.map(comment => {
        const date = new Date(comment.created_at).toLocaleString();
        return `
            <div class="comment">
                <div class="comment-author">${escapeHtml(comment.user_email)}</div>
                <div class="comment-date">${date}</div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
            </div>
        `;
    }).join('');
}

// Handle add comment
async function handleAddComment(promotionId) {
    if (!currentUser) {
        alert('Please log in to comment');
        return;
    }

    const textarea = document.getElementById(`comment-text-${promotionId}`);
    const text = textarea.value.trim();

    if (!text) {
        alert('Please enter a comment');
        return;
    }

    const { error } = await supabase
        .from('comments')
        .insert([
            {
                promotion_id: promotionId,
                user_id: currentUser.id,
                user_email: currentUser.email,
                text
            }
        ]);

    if (error) {
        alert('Error adding comment: ' + error.message);
    } else {
        textarea.value = '';
        await loadPromotions();
        await loadComments(promotionId);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.handleVote = handleVote;
window.toggleComments = toggleComments;
window.handleAddComment = handleAddComment;
