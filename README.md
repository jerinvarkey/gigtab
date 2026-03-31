# GigTab

Track shifts. Log hours. Get paid instantly.

## Deploy Steps (copy-paste)

### 1. Create Supabase Project
Go to https://supabase.com/dashboard and create a new project.
Copy your Project URL and anon key from Settings > API.

### 2. Run Schema
In Supabase Dashboard > SQL Editor, paste the contents of `supabase-schema.sql` and run it.

### 3. Configure Auth

**Google OAuth:**
- Go to https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID (Web application)
- Add authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- Copy Client ID and Client Secret
- In Supabase Dashboard > Authentication > Providers > Google, enable it and paste credentials

**Magic Link (email):**
- Already enabled by default in Supabase
- Go to Authentication > Email Templates to customize the sign-in email

**Auth Settings:**
- In Supabase Dashboard > Authentication > URL Configuration
- Set Site URL to your Vercel domain (e.g. `https://gigtab.vercel.app`)
- Add `http://localhost:3000` to Redirect URLs for local dev

### 4. Clone and Configure

```
git init gigtab
cd gigtab
```

Copy all project files into this directory, then:

```
copy .env.local.example .env.local
```

Edit `.env.local` with your Supabase URL and anon key:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Install and Run Locally

```
npm install
npm run dev
```

Open http://localhost:3000

### 6. Deploy to Vercel

```
git add -A
git commit -m "GigTab v1"
git remote add origin https://github.com/jerinvarkey/gigtab.git
git push -u origin main --force
```

Then in Vercel:
- Import the repo
- Add environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Deploy

### 7. Post-Deploy
- Update Supabase Site URL to your Vercel domain
- Update Google OAuth redirect URI to your Vercel domain
- Test sign-in with Google and magic link

## Architecture

- Next.js 14 single-file SPA (`app/page.js`)
- Supabase Auth (Google OAuth + email magic link)
- Supabase Database with RLS
- Tailwind CSS
- Deployed on Vercel

## Auth Flow

1. User picks "Business" or "Worker"
2. Signs in with Google or magic link
3. First-time users see onboarding (set name, create business or worker profile)
4. Returning users go straight to dashboard
5. Role detected from `business_members` or `workers` table
