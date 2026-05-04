import { createContext, useState, useCallback, useEffect } from 'react'

export const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('selectedLanguage', language)
    document.documentElement.lang = language
    // Set text direction for RTL languages
    if (language === 'ar' || language === 'he') {
      document.documentElement.dir = 'rtl'
    } else {
      document.documentElement.dir = 'ltr'
    }
  }, [language])

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang)
  }, [])

  const value = {
    language,
    changeLanguage,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export default LanguageContext
