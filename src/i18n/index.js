/**
 * i18n entry point — browser version
 * Server uses i18n/server.js directly (imported in server.js)
 */

export {
  t, detectLang, getLocaleMeta, getAvailableLocales, getLocale,
  createTranslator, setLocale, getCurrentLocale,
  SUPPORTED, DEFAULT, FALLBACK, LANGUAGES
} from './browser.js';
