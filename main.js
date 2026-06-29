// ============================================================
//  js/main.js  —  Sink OS entry point
//  Wires the Auth module to the page and handles hash routing
//  from the OAuth callback redirect.
// ============================================================

import * as Auth from './auth.js';

// Expose Auth globally so inline onclick handlers in HTML can reach it
window.Auth = Auth;

// ── Hash routing ────────────────────────────────────────────
// auth-callback.html sets a hash (#lock or #setup) before
// redirecting here so we know which screen to open.
const hash = window.location.hash;
if (hash === '#setup') {
  window.location.hash = '';
  Auth.go('screen-setup');
} else if (hash === '#lock') {
  window.location.hash = '';
  // Let initAuth handle it — it will see the active session
  // and route to the lock screen automatically.
  Auth.initAuth();
} else {
  // Normal page load — restore session if one exists
  Auth.initAuth();
}
