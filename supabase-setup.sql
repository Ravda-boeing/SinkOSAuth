-- ============================================================
--  Supabase SQL Setup
--  Run this in: supabase.com → your project → SQL Editor
-- ============================================================


-- ── 1. Profiles table ───────────────────────────────────────
--  Stores the Sink OS username and hashed OS password for each
--  authenticated user.  The `id` column is a foreign key to
--  Supabase Auth's built-in auth.users table.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username           TEXT NOT NULL UNIQUE,
  os_password_hash   TEXT NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. Row Level Security ────────────────────────────────────
--  Users can only read and write their own profile row.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow a user to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow a user to insert their own profile (first-time setup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow a user to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ── 3. Auto-cleanup ─────────────────────────────────────────
--  When a user is deleted from auth.users, their profile row
--  is also deleted automatically via the CASCADE above.
--  Nothing extra needed here.


-- ── 4. Optional: Username uniqueness index ───────────────────
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx
  ON public.profiles (LOWER(username));
--  Uses LOWER() so "SinkUser" and "sinkuser" are treated as
--  the same username.  Remove this if you want case-sensitive
--  usernames.
