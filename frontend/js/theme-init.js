/*
 * CareerPilot AI — runs synchronously in <head>, before first paint.
 * 1. Applies the saved theme (dark by default) and motion preference to avoid a flash.
 * 2. Configures the Tailwind Play CDN to use the design-system CSS variables.
 * Classic script on purpose (not a module) so it executes before the page renders.
 */
(function () {
  var root = document.documentElement;
  var theme = 'dark';
  try {
    var saved = JSON.parse(localStorage.getItem('cp:v1:theme'));
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (e) { /* storage unavailable: keep default */ }
  root.setAttribute('data-theme', theme);

  try {
    var settings = JSON.parse(localStorage.getItem('cp:v1:settings'));
    if (settings && settings.motion === 'reduced') root.setAttribute('data-motion', 'reduced');
  } catch (e) { /* ignore */ }

  if (window.tailwind) {
    var c = function (v) { return 'rgb(var(' + v + ') / <alpha-value>)'; };
    window.tailwind.config = {
      darkMode: ['selector', '[data-theme="dark"]'],
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
          colors: {
            bg: c('--bg'), surface: c('--surface'), 'surface-2': c('--surface-2'), line: c('--line'),
            ink: c('--text'), muted: c('--muted'), brand: c('--brand'), accent: c('--accent'),
            success: c('--success'), warning: c('--warning'), danger: c('--danger'),
          },
        },
      },
    };
  }
})();
