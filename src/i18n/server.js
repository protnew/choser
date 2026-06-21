/**
 * i18n — SERVER version (Node.js only, loaded by server.js)
 * Uses fs to read locale JSON files at startup.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const locales = {};
try {
  const files = readdirSync(join(__dir, 'locales')).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const code = f.replace('.json', '');
    locales[code] = JSON.parse(readFileSync(join(__dir, 'locales', f), 'utf-8'));
  }
} catch (e) {
  console.warn('[i18n] Failed to load locales:', e.message);
}

const SUPPORTED = Object.keys(locales);
const DEFAULT = 'ru';
const FALLBACK = 'en';

export function detectLang(req) {
  const url = new URL(req.url, 'http://localhost');
  const langParam = url.searchParams.get('lang');
  if (langParam && SUPPORTED.includes(langParam)) return langParam;

  const accept = req.headers?.get('accept-language') || req.headers?.['accept-language'] || '';
  if (accept) {
    const preferred = accept.split(',')[0]?.split(';')[0]?.trim()?.substring(0, 2).toLowerCase();
    if (preferred && SUPPORTED.includes(preferred)) return preferred;
  }
  return DEFAULT;
}

export function t(lang, key) {
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
  return (key) => t(lang, key);
}

export const LANGUAGES = SUPPORTED.map(code => ({
  code,
  name: (getLocaleMeta(code) || {}).name || code
}));

export { SUPPORTED, DEFAULT, FALLBACK };
