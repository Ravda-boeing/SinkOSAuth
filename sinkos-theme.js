/* sinkos-theme.js: shared SinkOS appearance. Reads what settings.html saves.
 *
 * Add as a normal (non-deferred) script in the <head> of every module, so the theme
 * is applied before the page paints:   <script src="sinkos-theme.js"></script>
 *
 * Nothing changes until the user customises something in Settings:
 *   - Theme "Default"      -> modules keep their own look (no data-sink-theme attribute)
 *   - Accent "Default"     -> no data-sink-accent attribute
 *   - Wallpaper "Default"  -> no data-sink-wallpaper attribute
 * Each module maps its own CSS variables to the --sink-* variables under those attributes.
 */
(function () {
  var KEY = 'sinkOS_settings', WPK = 'sinkOS_wallpaper';
  var DEF = { theme: 'default', accent: '', blur: 14, dim: 0, clock24: false, reduceMotion: false, largeText: false, highContrast: false };

  var PALETTES = {
    aero: {
      bg1: '#bfe6ff', bg2: '#e9fbff', bg3: '#d6f5d6', text: '#0b2540', muted: '#3d5a76',
      surface: '#ffffff', surface2: '#eef6ff', line: 'rgba(10,80,140,.18)',
      glass: 'rgba(255,255,255,.6)', glassStrong: 'rgba(255,255,255,.85)', shadow: 'rgba(10,80,140,.18)'
    },
    midnight: {
      bg1: '#06223d', bg2: '#0a3a5e', bg3: '#0b3b2e', text: '#eaf6ff', muted: '#a6c4dc',
      surface: '#0d2f4d', surface2: '#12405f', line: 'rgba(255,255,255,.14)',
      glass: 'rgba(255,255,255,.08)', glassStrong: 'rgba(255,255,255,.2)', shadow: 'rgba(0,0,0,.45)'
    },
    classic: {
      bg1: '#0a0f2b', bg2: '#0d1438', bg3: '#101a4a', text: '#cfe0ff', muted: '#8fa8de',
      surface: '#0d1438', surface2: '#141d4f', line: 'rgba(79,140,255,.28)',
      glass: 'rgba(13,20,56,.75)', glassStrong: 'rgba(79,140,255,.28)', shadow: 'rgba(0,0,0,.5)'
    }
  };

  function read() {
    var s = {}, k, out = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    for (k in DEF) out[k] = (typeof s[k] === typeof DEF[k]) ? s[k] : DEF[k];
    return out;
  }

  function wallpaper() {
    try { return localStorage.getItem(WPK) || 'none'; } catch (e) { return 'none'; }
  }

  function resolve(theme) {
    if (theme === 'auto') return (window.matchMedia && matchMedia('(prefers-color-scheme:dark)').matches) ? 'midnight' : 'aero';
    return PALETTES[theme] ? theme : null;       // "default" (or unknown) -> null -> module keeps its own look
  }

  function apply() {
    var s = read(), r = document.documentElement, wp = wallpaper();
    var t = resolve(s.theme), p = PALETTES[t || 'aero'];
    var set = function (n, v) { r.style.setProperty('--sink-' + n, v); };

    set('bg1', p.bg1); set('bg2', p.bg2); set('bg3', p.bg3);
    set('text', p.text); set('muted', p.muted);
    set('surface', p.surface); set('surface-2', p.surface2); set('line', p.line);
    set('glass', p.glass); set('glass-strong', p.glassStrong); set('shadow', p.shadow);
    set('accent', /^#[0-9a-f]{3,8}$/i.test(s.accent) ? s.accent : '#0a8fe0');
    set('blur', Math.max(0, Math.min(40, +s.blur || 0)) + 'px');
    set('dim', Math.max(0, Math.min(100, +s.dim || 0)) / 100);
    set('wallpaper', wp);

    // Attributes modules key their CSS on (only present when the user has chosen something)
    var toggleAttr = function (name, value) { value ? r.setAttribute(name, value) : r.removeAttribute(name); };
    toggleAttr('data-sink-theme', t);
    toggleAttr('data-sink-accent', /^#[0-9a-f]{3,8}$/i.test(s.accent) ? s.accent : '');
    toggleAttr('data-sink-wallpaper', wp !== 'none' ? 'on' : '');

    r.classList.toggle('sink-large', !!s.largeText);
    r.classList.toggle('sink-hc', !!s.highContrast);
    r.classList.toggle('sink-rm', !!s.reduceMotion);
  }

  var css =
    // wallpaper with the user's dimming baked in as a top layer
    ':root{--sink-bgimage:linear-gradient(rgba(0,0,0,var(--sink-dim,0)),rgba(0,0,0,var(--sink-dim,0))),var(--sink-wallpaper,none)}' +
    'html.sink-rm *{transition:none!important;animation:none!important}' +
    'html.sink-large{font-size:115%}' +
    'html[data-sink-accent]{accent-color:var(--sink-accent)}' +
    'html[data-sink-accent] ::selection{background:var(--sink-accent);color:#fff}';
  var style = document.createElement('style');
  style.id = 'sinkos-theme-css';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  apply();

  // Live updates when settings change in another tab, window or frame of the same origin
  window.addEventListener('storage', function (e) {
    if (e.key === null || e.key === KEY || e.key === WPK) apply();
  });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme:dark)');
    if (mq.addEventListener) mq.addEventListener('change', apply);
  }

  window.SinkTheme = { apply: apply, read: read, palettes: PALETTES, resolve: resolve };
})();