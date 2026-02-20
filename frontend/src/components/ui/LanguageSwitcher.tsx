import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggle = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => toggle('it')}
        className={`text-sm px-2 py-0.5 rounded-full transition-all duration-200 cursor-pointer ${
          i18n.language === 'it'
            ? 'bg-[#e8ff00] text-black font-semibold'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        🇮🇹 IT
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => toggle('en')}
        className={`text-sm px-2 py-0.5 rounded-full transition-all duration-200 cursor-pointer ${
          i18n.language === 'en'
            ? 'bg-[#e8ff00] text-black font-semibold'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        🇬🇧 EN
      </motion.button>
    </div>
  )
}
