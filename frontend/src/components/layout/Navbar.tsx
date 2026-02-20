import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'

export function Navbar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { count, toggleCart } = useCartStore()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setUserMenuOpen(false)
  }, [location])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return
      if (!userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const navLinks = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.shop'), to: '/shop' },
    { label: t('nav.about'), to: '/about' },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
          scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-2xl font-black tracking-tighter text-white">
            STATIC<span className="text-[#e8ff00]">.</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-[#e8ff00]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />

            {/* Cart */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleCart}
              className="relative text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {count() > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-[#e8ff00] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                >
                  {count()}
                </motion.span>
              )}
            </motion.button>

            {/* Auth */}
            {isAuthenticated() ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer px-2 py-1"
                >
                  {user?.firstName} {user?.lastName}
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-10 w-64 bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-3"
                    >
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block w-full text-left text-sm text-white hover:text-[#e8ff00] bg-white/5 border border-white/10 rounded-xl px-3 py-2 transition-colors"
                      >
                        Pannello utente
                      </Link>

                      <Link
                        to="/orders-summary"
                        onClick={() => setUserMenuOpen(false)}
                        className="mt-2 block w-full text-left text-sm text-white hover:text-[#e8ff00] bg-white/5 border border-white/10 rounded-xl px-3 py-2 transition-colors"
                      >
                        Riepilogo ordini
                      </Link>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          logout()
                        }}
                        className="mt-2 w-full text-left text-sm text-red-400 hover:text-red-300 bg-white/5 border border-red-400/30 rounded-xl px-3 py-2 transition-colors cursor-pointer"
                      >
                        {t('nav.logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-[#e8ff00] text-black! hover:text-black! px-4 py-2 rounded-full hover:bg-[#d4e800] transition-colors"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-gray-400 hover:text-white cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 bg-black/95 backdrop-blur-md border-b border-white/10 z-20 p-6 flex flex-col gap-4 md:hidden"
          >
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-white font-medium text-lg">
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              {isAuthenticated() ? (
                <>
                  <Link to="/profile" className="text-gray-300">Pannello utente</Link>
                  <Link to="/orders-summary" className="text-gray-300">Riepilogo ordini</Link>
                  <button onClick={logout} className="text-left text-red-400 cursor-pointer">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-400">{t('nav.login')}</Link>
                  <Link to="/register" className="text-[#e8ff00] font-semibold">{t('nav.register')}</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
