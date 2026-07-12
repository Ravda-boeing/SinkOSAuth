// ============================================================
//  js/main.js  —  Sink OS entry point
//  Wires the Auth module to the page and handles hash routing
//  from the OAuth callback redirect.
// ============================================================

import * as Auth from './auth.js';

// Expose Auth globally so inline onclick handlers in HTML can reach it
window.Auth = Auth;

// ── Capture return destination ──────────────────────────────
// Other Sink OS modules (Nexus, Chat, Calls, ...) can link here with
// ?redirect_to=<url> when a logged-out user needs to authenticate.
// Stash it in sessionStorage so it survives every redirect in this
// flow (login/setup/boot/lockscreen), including the OAuth round-trip.
const params = new URLSearchParams(window.location.search);
const redirectTo = params.get('redirect_to');
if (redirectTo) {
  sessionStorage.setItem('sinkos_return_to', redirectTo);
  // Clean the param out of the visible URL without reloading the page
  window.history.replaceState({}, '', window.location.pathname + window.location.hash);
}

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
