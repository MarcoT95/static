import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axios'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.user, res.data.accessToken)
      navigate('/')
    } catch {
      setError('password', { message: 'Email o password non corretti' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e8ff00]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="text-3xl font-black tracking-tighter text-white">
            STATIC<span className="text-[#e8ff00]">.</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">{t('auth.login')}</p>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{t('auth.email')}</label>
              <input
                type="email"
                {...register('email', { required: 'Email obbligatoria' })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">{t('auth.password')}</label>
                <a href="#" className="text-xs text-[#e8ff00] hover:underline">{t('auth.forgotPassword')}</a>
              </div>
              <input
                type="password"
                {...register('password', { required: 'Password obbligatoria' })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#e8ff00] text-black font-bold py-4 rounded-xl text-lg mt-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? '...' : t('auth.login')}
            </motion.button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-[#e8ff00] hover:underline font-medium">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
