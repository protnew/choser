import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getLocale, setLocale, LANGUAGES } from '../i18n';

const LangContext = createContext({
  locale: 'ru',
  changeLocale: () => {},
  languages: LANGUAGES,
});

export function LangProvider({ children }) {
  const [locale, setLocaleState] = useState(getLocale());

  const changeLocale = useCallback((lang) => {
    setLocale(lang);
    setLocaleState(lang);
  }, []);

  // Re-render when locale changes (for t() calls)
  useEffect(() => {
    // Dispatch custom event so non-React code can listen
    window.dispatchEvent(new CustomEvent('localechange', { detail: locale }));
  }, [locale]);

  return (
    <LangContext.Provider value={{ locale, changeLocale, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export default LangContext;
