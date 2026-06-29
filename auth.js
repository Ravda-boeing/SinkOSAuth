// ============================================================
//  js/auth.js  —  Sink OS authentication logic
// ============================================================

import { supabase } from './supabase.js';

// ------------------------------------------------------------------
// Screen router
// ------------------------------------------------------------------
export function go(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ------------------------------------------------------------------
// Error / UI helpers
// ------------------------------------------------------------------
export function showErr(id, msg) {
  const el = document.getElementById(id);
  if (msg) el.textContent = msg;
  el.classList.add('show');
}
export function hideErr(id) {
  document.getElementById(id).classList.remove('show');
}

export function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'PLEASE WAIT...' : btn.dataset.label;
}

// ------------------------------------------------------------------
// Password strength meter
// ------------------------------------------------------------------
export function checkStrength(pw) {
  const fill  = document.getElementById('str-fill');
  const label = document.getElementById('str-label');
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const colors = ['', '#E05A5A', '#E0A05A', '#4ECDA4', '#00C6E0'];
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Very strong'];
  fill.style.width      = (score * 25) + '%';
  fill.style.background = colors[score] || '';
  label.style.color     = colors[score] || 'var(--os-muted)';
  label.textContent     = pw.length ? labels[score] : '';
}

// ------------------------------------------------------------------
// Show/hide password toggle
// ------------------------------------------------------------------
export function togglePw(inputId, btn) {
  const input   = document.getElementById(inputId);
  const showing = input.type === 'text';
  input.type    = showing ? 'password' : 'text';
  btn.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
}

const EYE_OPEN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;
const EYE_CLOSED = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
    a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4
    c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;

// ------------------------------------------------------------------
// Boot sequence animation
// isNewUser = true  → redirect to onboarding.html after boot
// isNewUser = false → show lock screen after boot
// ------------------------------------------------------------------
export function runBoot(username, isNewUser = false) {
  go('screen-boot');
  const steps = [
    'Mounting filesystem...',
    'Loading user profile...',
    'Starting core services...',
    'Applying user settings...',
    'Ready.',
  ];
  const fill   = document.getElementById('boot-fill');
  const status = document.getElementById('boot-status');
  const title  = document.getElementById('boot-text');
  let pct = 0;

  const timer = setInterval(() => {
    pct += Math.random() * 9 + 3;
    if (pct > 100) pct = 100;
    fill.style.width = pct + '%';
    const idx = Math.min(Math.floor((pct / 100) * steps.length), steps.length - 1);
    status.textContent = steps[idx];

    if (pct >= 100) {
      clearInterval(timer);
      title.textContent = 'SYSTEM READY';
      setTimeout(() => {
        if (isNewUser) {
          window.location.href = '/onboarding.html';
        } else {
          window.location.href = '/lockscreen.html';
        }
      }, 600);
    }
  }, 80);
}

function showLock(username) {
  document.getElementById('lock-username').textContent = username || 'user';
  document.getElementById('lock-pw').value = '';
  hideErr('lock-err');
  go('screen-lock');
}

// ------------------------------------------------------------------
// Profile helpers  (profiles table in Supabase)
// ------------------------------------------------------------------
async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('username, os_password_hash')
    .eq('id', userId)
    .single();
  return data;
}

async function createProfile(userId, username, osPwHash) {
  const { error } = await supabase
    .from('profiles')
    .insert({ id: userId, username, os_password_hash: osPwHash });
  return error;
}

// Simple client-side hash (SHA-256) for the OS password.
// This is a secondary local credential — account security is handled
// by Supabase Auth.  For stronger protection, move verification
// to a Supabase Edge Function.
async function hashPassword(pw) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------
// AUTH: Email login
// ------------------------------------------------------------------
export async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-password').value;
  hideErr('login-err');

  if (!email || !pw) { showErr('login-err', 'Enter your email and password.'); return; }

  setLoading('btn-login', true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  setLoading('btn-login', false);

  if (error) { showErr('login-err', error.message); return; }

  const profile = await getProfile(data.user.id);
  if (!profile) {
    go('screen-setup');          // first time — collect username + OS password
  } else {
    runBoot(profile.username);   // returning user — lock screen after boot
  }
}

// ------------------------------------------------------------------
// AUTH: Email register
// ------------------------------------------------------------------
export async function doRegister() {
  const email = document.getElementById('reg-email').value.trim();
  const pw    = document.getElementById('reg-password').value;
  hideErr('reg-err');

  if (!email || pw.length < 6) {
    showErr('reg-err', 'Enter a valid email and password (min 6 characters).');
    return;
  }

  setLoading('btn-register', true);
  const { error } = await supabase.auth.signUp({ email, password: pw });
  setLoading('btn-register', false);

  if (error) { showErr('reg-err', error.message); return; }

  // Supabase sends a confirmation email by default.
  // If you disable email confirmation in the Supabase dashboard,
  // the user is signed in immediately and you can call go('screen-setup').
  go('screen-verify');
}

// ------------------------------------------------------------------
// AUTH: OAuth (Google / GitHub)
// ------------------------------------------------------------------
export async function doOAuth(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,                          // 'google' or 'github'
    options: {
      redirectTo: window.location.origin + '/auth-callback.html',
    },
  });
  if (error) alert(error.message);
}

// ------------------------------------------------------------------
// AUTH: First-time profile setup
// Runs for ALL new users (email or OAuth) — redirects to onboarding
// ------------------------------------------------------------------
export async function doSetup() {
  const username = document.getElementById('setup-username').value.trim();
  const ospw     = document.getElementById('setup-ospw').value;
  const ospw2    = document.getElementById('setup-ospw2').value;
  hideErr('setup-err');

  if (!username)       { showErr('setup-err', 'Choose a username.'); return; }
  if (ospw.length < 4) { showErr('setup-err', 'OS password must be at least 4 characters.'); return; }
  if (ospw !== ospw2)  { showErr('setup-err', "Passwords don't match."); return; }

  setLoading('btn-setup', true);
  const { data: { user } } = await supabase.auth.getUser();
  const hash  = await hashPassword(ospw);
  const error = await createProfile(user.id, username, hash);
  setLoading('btn-setup', false);

  if (error) { showErr('setup-err', error.message); return; }

  // Cache hash in sessionStorage so the lock screen can verify
  // without a round-trip on every unlock during the same session.
  sessionStorage.setItem('os_pw_hash', hash);

  // isNewUser = true → boot will redirect to onboarding.html
  runBoot(username, true);
}

// ------------------------------------------------------------------
// LOCK: Verify OS password
// ------------------------------------------------------------------
export async function doUnlock() {
  const pw = document.getElementById('lock-pw').value;
  hideErr('lock-err');

  // Try session cache first; fall back to DB lookup.
  let storedHash = sessionStorage.getItem('os_pw_hash');
  if (!storedHash) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { doSignOut(); return; }
    const profile = await getProfile(user.id);
    storedHash    = profile?.os_password_hash ?? null;
    if (storedHash) sessionStorage.setItem('os_pw_hash', storedHash);
  }

  const inputHash = await hashPassword(pw);
  if (inputHash === storedHash) {
    go('screen-home');
    const username = document.getElementById('lock-username').textContent;
    document.getElementById('home-username').textContent = username;
  } else {
    showErr('lock-err', 'Incorrect OS password.');
    document.getElementById('lock-pw').value = '';
  }
}

export function doLock() {
  document.getElementById('lock-pw').value = '';
  hideErr('lock-err');
  go('screen-lock');
}

export async function doSignOut() {
  sessionStorage.removeItem('os_pw_hash');
  await supabase.auth.signOut();
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
  go('screen-login');
}

// ------------------------------------------------------------------
// Session restore on page load
// ------------------------------------------------------------------
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { go('screen-login'); return; }

  const profile = await getProfile(session.user.id);
  if (!profile) { go('screen-setup'); return; }

  // Already have a session → go straight to lock screen
  window.location.href = '/lockscreen.html';
}