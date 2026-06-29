# Sink OS — Auth System Setup Guide

## File structure

```
sink-os-auth/
├── index.html            ← All auth screens + desktop placeholder
├── auth-callback.html    ← OAuth redirect landing page
├── supabase-setup.sql    ← Run this once in Supabase SQL Editor
├── css/
│   └── auth.css          ← All styles
└── js/
    ├── supabase.js       ← Supabase client (put your keys here)
    ├── auth.js           ← All auth logic
    └── main.js           ← Entry point / hash router
```

---

## Step 1 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, give it a name (e.g. `sink-os`), and wait for it to provision.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** key

Paste both into `js/supabase.js` where marked.

---

## Step 2 — Run the database setup

1. In your Supabase project, go to **SQL Editor → New query**.
2. Paste the entire contents of `supabase-setup.sql` and click **Run**.

This creates the `profiles` table with Row Level Security so users can only access their own data.

---

## Step 3 — Enable OAuth providers

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add your site URL + `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback` as authorised redirect URIs.
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase: **Authentication → Providers → Google** → enable and paste both keys.

### GitHub
1. Go to [GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App](https://github.com/settings/applications/new).
2. Set **Homepage URL** to your site URL.
3. Set **Authorization callback URL** to `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and generate a **Client Secret**.
5. In Supabase: **Authentication → Providers → GitHub** → enable and paste both keys.

---

## Step 4 — Set your redirect URL

In Supabase: **Authentication → URL Configuration**

- **Site URL**: your production URL (e.g. `https://sinko-os.example.com`)
- **Redirect URLs**: add `https://your-site.com/auth-callback.html`

For local development, also add `http://localhost:5500/auth-callback.html` (or whatever port you use).

---

## Step 5 — Serve with a local server

The files use ES modules (`type="module"`), so you **cannot** open `index.html` directly as a `file://` URL — you need a local server.

**Quickest options:**

```bash
# VS Code: install the "Live Server" extension, right-click index.html → Open with Live Server

# Node.js (npx, no install needed):
npx serve .

# Python:
python3 -m http.server 8080
```

---

## Step 6 — Email confirmation (optional)

By default Supabase requires users to confirm their email before they can sign in.  
The `screen-verify` screen handles this gracefully.

To **disable** email confirmation during development:  
**Supabase → Authentication → Providers → Email** → toggle off **Confirm email**.

---

## Integrating with your existing Sink OS desktop

Replace the `screen-home` block in `index.html` with your actual desktop markup.  
The only requirement is that it has `id="screen-home"` so the router can show it after unlock.

To lock the screen from anywhere in your OS code:
```js
import * as Auth from './js/auth.js';
Auth.doLock();
```

To sign the user out:
```js
Auth.doSignOut();
```

---

## How the OS password works

The OS password is **separate from the account password**:

| Password | Used for | Stored where |
|---|---|---|
| Account password | Supabase Auth (email login) | Supabase — never touched by you |
| OS password | Lock screen unlock | SHA-256 hash in `profiles.os_password_hash` |

The OS password hash is cached in `sessionStorage` after first unlock so the lock screen doesn't need a database round-trip on every unlock during the same browser session.
