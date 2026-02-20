import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axios'

interface RegisterForm {
  firstName: string
  lastName: string
  email: string
  address: string
  billingAddress: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm<RegisterForm>()

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Le password non corrispondono' })
      return
    }
    try {
      const res = await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        address: data.address,
        billingAddress: data.billingAddress,
        password: data.password,
      })
      setAuth(res.data.user, res.data.accessToken)
      navigate('/')
    } catch {
      setError('email', { message: 'Email già in uso' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e8ff00]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-10">
          <Link to="/" className="text-3xl font-black tracking-tighter text-white">
            STATIC<span className="text-[#e8ff00]">.</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">{t('auth.register')}</p>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">{t('auth.firstName')}</label>
                <input
                  {...register('firstName', { required: 'Obbligatorio' })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                  placeholder="Marco"
                />
                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">{t('auth.lastName')}</label>
                <input
                  {...register('lastName', { required: 'Obbligatorio' })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                  placeholder="Rossi"
                />
                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

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

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Indirizzo</label>
              <input
                {...register('address', { required: 'Indirizzo obbligatorio' })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                placeholder="Via Roma 10, Milano"
              />
              {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Indirizzo fatturazione</label>
              <input
                {...register('billingAddress', { required: 'Indirizzo fatturazione obbligatorio' })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                placeholder="Via Fattura 25, Milano"
              />
              {errors.billingAddress && <p className="text-red-400 text-xs mt-1">{errors.billingAddress.message}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">{t('auth.password')}</label>
              <input
                type="password"
                {...register('password', { required: 'Password obbligatoria', minLength: { value: 6, message: 'Min 6 caratteri' } })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: 'Conferma la password',
                  validate: (val) => val === watch('password') || 'Le password non corrispondono'
                })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 transition-colors"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#e8ff00] text-black font-bold py-4 rounded-xl text-lg mt-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? '...' : t('auth.register')}
            </motion.button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-[#e8ff00] hover:underline font-medium">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
