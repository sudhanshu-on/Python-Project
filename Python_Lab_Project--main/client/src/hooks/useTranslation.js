import { useContext } from 'react'
import { LanguageContext } from '../contexts/LanguageContext'
import { translations } from '../data/translations'

export const useTranslation = () => {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider')
  }

  const { language } = context
  const currentTranslations = translations[language] || translations['en']

  const t = (key) => {
    const keys = key.split('.')
    let value = currentTranslations

    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  }

  return {
    language,
    t,
    changeLanguage: context.changeLanguage,
  }
}

export default useTranslation
