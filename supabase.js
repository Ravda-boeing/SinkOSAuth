// ============================================================
//  js/supabase.js  —  Supabase client initialisation
//  Replace the two placeholder values with your project's
//  URL and anon key from: supabase.com → Project Settings → API
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://okknkixdbjsnqrwlfgzn.supabase.co ';   // ← replace
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ra25raXhkYmpzbnFyd2xmZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzgwNzQsImV4cCI6MjA5ODE1NDA3NH0.L2QDUnez8KjIM8yg9cB9cs-tTq6nedk3CCpuJBjWBEg';                          // ← replace

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
