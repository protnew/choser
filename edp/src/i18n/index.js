/**
 * i18n Provider — language detection and translation
 * Supports: ru, en, zh, es, pt, de, fr, ja, ko, ar
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load all locales
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

/**
 * Detect language from request
 * Priority: ?lang= param > Accept-Language header > default
 */
export function detectLang(req) {
  // 1. Query param
  const url = new URL(req.url, 'http://localhost');
  const langParam = url.searchParams.get('lang');
  if (langParam && SUPPORTED.includes(langParam)) return langParam;

  // 2. Accept-Language header
  const accept = req.headers?.get('accept-language') || req.headers?.['accept-language'] || '';
  if (accept) {
    const preferred = accept.split(',')[0]?.split(';')[0]?.trim()?.substring(0, 2).toLowerCase();
    if (preferred && SUPPORTED.includes(preferred)) return preferred;
  }

  return DEFAULT;
}

/**
 * Get translation for a key in given language
 * Falls back to en, then returns the key itself
 */
export function t(lang, key) {
  const locale = locales[lang] || locales[FALLBACK] || {};
  
  // Support dot notation: "nav.tables"
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

/**
 * Get locale meta info (name, direction)
 */
export function getLocaleMeta(lang) {
  return locales[lang]?.meta || locales[FALLBACK]?.meta || { name: lang, code: lang, dir: 'ltr' };
}

/**
 * Get all available locales with metadata
 */
export function getAvailableLocales() {
  return SUPPORTED.map(code => ({
    code,
    name: locales[code]?.meta?.name || code,
    dir: locales[code]?.meta?.dir || 'ltr'
  }));
}

/**
 * Get full locale object for a language
 */
export function getLocale(lang) {
  return locales[lang] || locales[FALLBACK];
}

/**
 * Create a translation function bound to a language
 */
export function createTranslator(lang) {
  return (key) => t(lang, key);
}

export { SUPPORTED, DEFAULT, FALLBACK };
