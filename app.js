// Global state
let currentUser = null;
let currentPromotions = [];
let userVotes = new Map();

// DOM Elements - will be initialized after DOM loads
let loginBtn, logoutBtn, userInfo, userEmailSpan, authModal, authForm, signupBtn, closeModal;
let addPromoSection, promoForm, promotionsList, sortSelect;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initializing...');
    
    // Check if Supabase is configured
    if (!window.supabase || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        alert('ERROR: Please configure Supabase credentials in config.js file!');
        return;
    }
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check authentication status
    await checkUser();
    
    // Load promotions
    await loadPromotions();
    
    console.log('App initialized successfully');
});

// Initialize DOM elements
function initializeDOMElements() {
    loginBtn = document.getElementById('login-btn');
    logoutBtn = document.getElementById('logout-btn');
    userInfo = document.getElementById('user-info');
    userEmailSpan = document.getElementById('user-email');
    authModal = document.getElementById('auth-modal');
    authForm = document.getElementById('auth-form');
    signupBtn = document.getElementById('signup-btn');
    closeModal = document.querySelector('.close');
    addPromoSection = document.getElementById('add-promo-section');
    promoForm = document.getElementById('promo-form');
    promotionsList = document.getElementById('promotions-list');
    sortSelect = document.getElementById('sort-select');
}

// Setup event listeners
function setupEventListeners() {
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            authModal.style.display = 'block';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    if (authForm) {
        authForm.addEventListener('submit', handleLogin);
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignup);
    }
    
    if (promoForm) {
        promoForm.addEventListener('submit', handleAddPromotion);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', loadPromotions);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            updateUIForLoggedInUser();
            loadUserVotes();
            loadPromotions();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userVotes.clear();
            updateUIForLoggedOutUser();
            loadPromotions();
        }
    });
}

// Check if user is logged in
async function checkUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Error checking user:', error);
            updateUIForLoggedOutUser();
            return;
        }
        
        if (user) {
            console.log('User is logged in:', user.email);
            currentUser = user;
            updateUIForLoggedInUser();
            await loadUserVotes();
        } else {
            console.log('No user logged in');
            updateUIForLoggedOutUser();
        }
    } catch (err) {
        console.error('Exception in checkUser:', err);
        updateUIForLoggedOutUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    if (!currentUser) return;
    
    console.log('Updating UI for logged in user');
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userEmailSpan) userEmailSpan.textContent = currentUser.email;
    if (addPromoSection) addPromoSection.style.display = 'block';
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    console.log('Updating UI for logged out user');
    if (loginBtn) loginBtn.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (addPromoSection) addPromoSection.style.display = 'none';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    console.log('Attempting login...');
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
            return;
        }

        console.log('Login successful:', data.user.email);
        currentUser = data.user;
        authModal.style.display = 'none';
        authForm.reset();
        updateUIForLoggedInUser();
        await loadUserVotes();
        await loadPromotions();
        
    } catch (err) {
        console.error('Login exception:', err);
        alert('Login failed: ' + err.message);
    }
}

// Handle signup
async function handleSignup(e) {
    if (e) e.preventDefault();
    console.log('Attempting signup...');
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) {
            console.error('Signup error:', error);
            alert('Signup failed: ' + error.message);
            return;
        }

        console.log('Signup successful');
        alert('Signup successful! You can now sign in with your credentials.');
        authForm.reset();
        
    } catch (err) {
        console.error('Signup exception:', err);
        alert('Signup failed: ' + err.message);
    }
}

// Handle logout
async function handleLogout() {
    console.log('Logging out...');
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            alert('Logout failed: ' + error.message);
        } else {
            currentUser = null;
            userVotes.clear();
            updateUIForLoggedOutUser();
            await loadPromotions();
        }
    } catch (err) {
        console.error('Logout exception:', err);
    }
}

// Load user votes
async function loadUserVotes() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabase
            .from('votes')
            .select('promotion_id')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Error loading votes:', error);
            return;
        }

        userVotes.clear();
        if (data) {
            data.forEach(vote => {
                userVotes.set(vote.promotion_id, true);
            });
            console.log('Loaded user votes:', userVotes.size);
        }
    } catch (err) {
        console.error('Exception loading votes:', err);
    }
}

// Handle add promotion
async function handleAddPromotion(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please log in to add promotions');
        return;
    }

    const title = document.getElementById('promo-title').value.trim();
    const description = document.getElementById('promo-description').value.trim();
    const link = document.getElementById('promo-link').value.trim();
    const store = document.getElementById('promo-store').value.trim();

    if (!title || !description || !store) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('promotions')
            .insert([
                {
                    title: title,
                    description: description,
                    link: link || null,
                    store: store,
                    user_id: currentUser.id
                }
            ])
            .select();

        if (error) {
            console.error('Error adding promotion:', error);
            alert('Error adding promotion: ' + error.message);
            return;
        }

        console.log('Promotion added successfully');
        promoForm.reset();
        await loadPromotions();
        alert('Promotion added successfully!');
        
    } catch (err) {
        console.error('Exception adding promotion:', err);
        alert('Error adding promotion: ' + err.message);
    }
}

// Load promotions
async function loadPromotions() {
    console.log('Loading promotions...');
    
    try {
        const sortBy = sortSelect ? sortSelect.value : 'newest';
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
            console.error('Error loading promotions:', error);
            promotionsList.innerHTML = '<div class="card">Error loading promotions: ' + error.message + '</div>';
            return;
        }

        currentPromotions = data || [];
        console.log('Loaded promotions:', currentPromotions.length);

        // Sort by popularity if needed
        if (sortBy === 'popular') {
            currentPromotions.sort((a, b) => {
                const aVotes = a.votes[0]?.count || 0;
                const bVotes = b.votes[0]?.count || 0;
                return bVotes - aVotes;
            });
        }

        renderPromotions();
        
    } catch (err) {
        console.error('Exception loading promotions:', err);
        promotionsList.innerHTML = '<div class="card">Error loading promotions: ' + err.message + '</div>';
    }
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
                        <button class="vote-btn ${hasVoted ? 'voted' : ''}" onclick="handleVote('${promo.id}')" ${!currentUser ? 'disabled' : ''} title="${!currentUser ? 'Please log in to vote' : ''}">
                            👍
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

    console.log('Toggling vote for promotion:', promotionId);
    const hasVoted = userVotes.has(promotionId);

    try {
        if (hasVoted) {
            // Remove vote
            const { error } = await supabase
                .from('votes')
                .delete()
                .eq('promotion_id', promotionId)
                .eq('user_id', currentUser.id);

            if (error) {
                console.error('Error removing vote:', error);
                alert('Error removing vote: ' + error.message);
                return;
            }
            
            userVotes.delete(promotionId);
            console.log('Vote removed');
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

            if (error) {
                console.error('Error adding vote:', error);
                alert('Error adding vote: ' + error.message);
                return;
            }
            
            userVotes.set(promotionId, true);
            console.log('Vote added');
        }

        await loadPromotions();
        
    } catch (err) {
        console.error('Exception handling vote:', err);
        alert('Error handling vote: ' + err.message);
    }
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

    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*, user_email')
            .eq('promotion_id', promotionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading comments:', error);
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
        
    } catch (err) {
        console.error('Exception loading comments:', err);
        commentsList.innerHTML = '<p>Error loading comments</p>';
    }
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

    try {
        const { error } = await supabase
            .from('comments')
            .insert([
                {
                    promotion_id: promotionId,
                    user_id: currentUser.id,
                    user_email: currentUser.email,
                    text: text
                }
            ]);

        if (error) {
            console.error('Error adding comment:', error);
            alert('Error adding comment: ' + error.message);
            return;
        }

        console.log('Comment added successfully');
        textarea.value = '';
        await loadPromotions();
        await loadComments(promotionId);
        
    } catch (err) {
        console.error('Exception adding comment:', err);
        alert('Error adding comment: ' + err.message);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.handleVote = handleVote;
window.toggleComments = toggleComments;
window.handleAddComment = handleAddComment;
