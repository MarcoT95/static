import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { isAuthenticated, updateUser } = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    const loadProfile = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/auth/me')
        const me = res.data
        updateUser(me)
        setFirstName(me.firstName ?? '')
        setLastName(me.lastName ?? '')
        setEmail(me.email ?? '')
        setPhone(me.phone ?? '')
        setAddress(me.address ?? '')
        setBillingAddress(me.billingAddress ?? '')
      } catch {
        setError('Errore nel caricamento del profilo')
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [isAuthenticated, navigate, updateUser])

  const saveProfile = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Inserisci una email valida')
      return
    }

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress,
      }

      const res = await api.patch('/auth/me', payload)
      updateUser(res.data)
      setMessage('Profilo aggiornato con successo')
    } catch {
      setError('Errore nel salvataggio del profilo')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword) {
      setError('Inserisci la password attuale')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('La nuova password deve avere almeno 6 caratteri')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError('Le nuove password non coincidono')
      return
    }

    setSavingPassword(true)
    setMessage(null)
    setError(null)
    try {
      await api.patch('/auth/me/password', {
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setMessage('Password aggiornata con successo')
    } catch {
      setError('Errore nel cambio password (verifica la password attuale)')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-28 px-6">
        <div className="max-w-5xl mx-auto text-gray-400">Caricamento profilo...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.25em] mb-3">Pannello utente</p>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-none">I tuoi dati</h1>
          <p className="text-gray-400 mt-4">Gestisci dati anagrafici, indirizzi e metodi di pagamento.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-bold text-xl">Dati anagrafici</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Nome</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Cognome</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Telefono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
            </div>
          </div>

          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-bold text-xl">Indirizzi</h2>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Indirizzo</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Indirizzo fatturazione</label>
              <input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mt-6 space-y-4">
          <h2 className="text-white font-bold text-xl">Sicurezza</h2>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Password attuale</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Nuova password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Conferma nuova password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={savePassword}
            disabled={savingPassword}
            className="bg-white/10 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-60 cursor-pointer"
          >
            {savingPassword ? 'Aggiornamento...' : 'Aggiorna password'}
          </motion.button>
        </div>

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        {message && <p className="text-[#e8ff00] text-sm mt-4">{message}</p>}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={saveProfile}
          disabled={saving}
          className="mt-6 bg-[#e8ff00] text-black font-black py-4 px-8 rounded-xl text-lg disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </motion.button>
      </div>
    </div>
  )
}
