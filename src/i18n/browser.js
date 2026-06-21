/**
 * i18n — BROWSER version (loaded by Vite into frontend bundle)
 * Uses import.meta.glob to bundle all locale JSON at build time.
 * NO Node.js APIs (fs, path, url) — they crash the browser.
 *
 * API: t(key) — ONE argument (browser uses getCurrentLocale internally)
 * This matches how frontend components call t().
 */

// Vite glob import — bundles all JSON at build time
const localeModules = import.meta.glob('./locales/*.json', { eager: true, query: '?json', import: 'default' });

const locales = {};
for (const path in localeModules) {
  const code = path.match(/\/([^/]+)\.json$/)?.[1] || path;
  locales[code] = localeModules[path];
}

const SUPPORTED = Object.keys(locales);
const DEFAULT = 'ru';
const FALLBACK = 'en';

// --- Browser locale state ---
let _browserLocale = null;

export function setLocale(lang) {
  _browserLocale = lang;
  try { localStorage.setItem('choser_lang', lang); } catch (e) {}
}

export function getCurrentLocale() {
  if (_browserLocale) return _browserLocale;
  try { return localStorage.getItem('choser_lang') || DEFAULT; } catch (e) { return DEFAULT; }
}

// --- Translation ---
// Browser API: t(key) — uses current locale from localStorage
export function t(key) {
  const lang = getCurrentLocale();
  const locale = locales[lang] || locales[FALLBACK] || {};
  const parts = key.split('.');
  let value = locale;
  for (const p of parts) {
    if (value && typeof value === 'object') value = value[p];
    else { value = undefined; break; }
  }
  if (value !== undefined) return value;

  // Fallback to English
  let enValue = locales[FALLBACK];
  for (const p of parts) {
    if (enValue && typeof enValue === 'object') enValue = enValue[p];
    else { enValue = undefined; break; }
  }
  return enValue || key;
}

// --- Server-side t: t(lang, key) — used by i18n/server.js for API ---
export function tServer(lang, key) {
  const locale = locales[lang] || locales[FALLBACK] || {};
  const parts = key.split('.');
  let value = locale;
  for (const p of parts) {
    if (value && typeof value === 'object') value = value[p];
    else { value = undefined; break; }
  }
  if (value !== undefined) return value;
  let enValue = locales[FALLBACK];
  for (const p of parts) {
    if (enValue && typeof enValue === 'object') enValue = enValue[p];
    else { enValue = undefined; break; }
  }
  return enValue || key;
}

// --- Locale metadata ---
export function getLocaleMeta(lang) {
  return locales[lang]?.meta || locales[FALLBACK]?.meta || { name: lang, code: lang, dir: 'ltr' };
}

export function getAvailableLocales() {
  return SUPPORTED.map(code => ({
    code,
    name: locales[code]?.meta?.name || code,
    dir: locales[code]?.meta?.dir || 'ltr'
  }));
}

export function getLocale(lang) {
  return locales[lang] || locales[FALLBACK];
}

export function createTranslator(lang) {
  return (key) => tServer(lang, key);
}

// --- Server stubs (no-ops in browser; real impl in i18n/server.js) ---
export function detectLang() { return DEFAULT; }

export const LANGUAGES = SUPPORTED.map(code => ({
  code,
  name: (getLocaleMeta(code) || {}).name || code
}));

export { SUPPORTED, DEFAULT, FALLBACK };
