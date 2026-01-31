# 🎯 Promo Share - Promotions Sharing Website

A modern web application where users can share promotions, vote on them, and discuss them through comments. Built with vanilla JavaScript and Supabase as the backend.

## Features

- 🔐 **User Authentication** - Sign up and sign in with email/password
- ➕ **Add Promotions** - Share deals and promotions with the community
- 👍 **Vote System** - Upvote promotions you like
- 💬 **Comments** - Discuss promotions with other users
- 🎨 **Modern UI** - Clean, responsive design that works on all devices
- 🔄 **Real-time Updates** - See new promotions and votes instantly
- 🔒 **Row-Level Security** - Your data is protected with Supabase RLS

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to finish setting up

### 2. Configure the Database

1. In your Supabase project, go to the **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste it into the SQL Editor and click **Run**
4. This will create all necessary tables, policies, and indexes

### 3. Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy your **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
3. Copy your **anon/public** key

### 4. Configure the Frontend

1. Open `config.js` in the project files
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'your-project-url-here';
   const SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```

### 5. Deploy to GitHub Pages

#### Option A: Using GitHub Web Interface

1. Create a new repository on GitHub
2. Upload all files (`index.html`, `styles.css`, `app.js`, `config.js`)
3. Go to **Settings** → **Pages**
4. Under **Source**, select **main** branch
5. Click **Save**
6. Your site will be live at `https://yourusername.github.io/repo-name`

#### Option B: Using Git Command Line

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/repo-name.git

# Push to GitHub
git branch -M main
git push -u origin main

# Enable GitHub Pages in your repository settings
```

## File Structure

```
promo-site/
├── index.html           # Main HTML structure
├── styles.css           # All styling
├── app.js              # Application logic
├── config.js           # Supabase configuration
├── supabase-schema.sql # Database schema
└── README.md           # This file
```

## Database Schema

### Tables

1. **promotions** - Stores all promotion posts
   - id (UUID)
   - title (TEXT)
   - description (TEXT)
   - link (TEXT, optional)
   - store (TEXT)
   - user_id (UUID)
   - created_at (TIMESTAMP)

2. **votes** - Stores user votes on promotions
   - id (UUID)
   - promotion_id (UUID)
   - user_id (UUID)
   - created_at (TIMESTAMP)
   - Unique constraint on (promotion_id, user_id)

3. **comments** - Stores comments on promotions
   - id (UUID)
   - promotion_id (UUID)
   - user_id (UUID)
   - user_email (TEXT)
   - text (TEXT)
   - created_at (TIMESTAMP)

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only edit/delete their own promotions and comments
- All data access is controlled through Supabase policies
- Authentication is handled securely by Supabase Auth

## Usage

### For Users

1. **Sign Up/Sign In**: Click "Sign In" button and create an account
2. **Add Promotion**: Fill out the form to share a new promotion
3. **Vote**: Click the thumbs up button to vote on promotions
4. **Comment**: Click on the comment count to view and add comments
5. **Sort**: Use the dropdown to sort by newest, oldest, or most popular

### Sorting Options

- **Newest First**: Shows most recently added promotions
- **Oldest First**: Shows oldest promotions first
- **Most Popular**: Sorts by number of votes (most voted first)

## Customization

### Styling

Edit `styles.css` to customize:
- Colors (primary color is #667eea)
- Fonts
- Layout
- Responsive breakpoints

### Features

You can extend the app by:
- Adding categories/tags for promotions
- Implementing search functionality
- Adding user profiles
- Creating a rating system
- Adding image uploads for promotions
- Implementing email notifications

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Issue: "Invalid API key"
- Make sure you copied the **anon/public** key, not the service key
- Check that SUPABASE_URL and SUPABASE_ANON_KEY are correct in config.js

### Issue: "Row Level Security policy violation"
- Ensure you ran the complete SQL schema in Supabase
- Check that RLS policies were created successfully

### Issue: "Cannot read promotions"
- Verify the promotions table exists in Supabase
- Check browser console for specific error messages

### Issue: Email confirmation not working
- In Supabase Dashboard, go to Authentication → Settings
- You can disable email confirmation for testing

## License

MIT License - feel free to use this project however you like!

## Support

For issues related to:
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **GitHub Pages**: Check [GitHub Pages Documentation](https://docs.github.com/pages)

## Credits

Built with:
- [Supabase](https://supabase.com) - Backend as a Service
- Vanilla JavaScript - No frameworks needed!
- CSS3 with modern gradients and animations
