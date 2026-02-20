import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/axios'

interface AdminUser {
  id: number
  firstName: string
  lastName: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  orderCount: number
  totalSpent: number
}

interface OrderItem {
  id: number
  productId: number
  quantity: number
  unitPrice: number
}

interface AdminOrder {
  id: number
  status: string
  total: number
  shippingAddress: string | null
  notes: string | null
  createdAt: string
  items: OrderItem[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  processing: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  shipped: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  delivered: 'text-green-400 bg-green-400/10 border-green-400/30',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/30',
}

function OrderRow({ order }: { order: AdminOrder }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const statusClass = STATUS_COLORS[order.status] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/30'

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-xs font-mono">#{order.id}</span>
          <span className="text-white text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
          <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${statusClass}`}>
            {t(`admin.status.${order.status}`, order.status)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#e8ff00] font-semibold text-sm">€{Number(order.total).toFixed(2)}</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/10 bg-white/[0.02]">
              {order.shippingAddress && (
                <p className="text-gray-500 text-xs mb-3">
                  <span className="text-gray-400 font-medium">{t('admin.shippingAddress')}: </span>
                  {order.shippingAddress}
                </p>
              )}
              {order.notes && (
                <p className="text-gray-500 text-xs mb-3">
                  <span className="text-gray-400 font-medium">{t('admin.notes')}: </span>
                  {order.notes}
                </p>
              )}
              {order.items && order.items.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/5">
                      <th className="text-left py-1">{t('admin.product')}</th>
                      <th className="text-right py-1">{t('admin.qty')}</th>
                      <th className="text-right py-1">{t('admin.unitPrice')}</th>
                      <th className="text-right py-1">{t('admin.lineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 text-gray-300">
                        <td className="py-1.5">{t('admin.productId')} #{item.productId}</td>
                        <td className="text-right py-1.5">{item.quantity}</td>
                        <td className="text-right py-1.5">€{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="text-right py-1.5 text-white font-medium">
                          €{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-600 text-xs">{t('admin.noItems')}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function UserCard({ user }: { user: AdminUser }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const handleExpand = async () => {
    if (!expanded && !loaded) {
      setLoading(true)
      try {
        const { data } = await api.get<AdminOrder[]>(`/admin/users/${user.id}/orders`)
        setOrders(data)
        setLoaded(true)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    setExpanded((v) => !v)
  }

  return (
    <motion.div
      layout
      className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={handleExpand}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[#e8ff00]/10 border border-[#e8ff00]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#e8ff00] text-sm font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              {user.firstName} {user.lastName}
              {user.role === 'admin' && (
                <span className="ml-2 text-[0.65rem] font-bold text-[#e8ff00] bg-[#e8ff00]/10 border border-[#e8ff00]/30 rounded-full px-2 py-0.5">
                  ADMIN
                </span>
              )}
            </p>
            <p className="text-gray-500 text-xs">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex gap-6">
            <div className="text-right">
              <p className="text-white font-semibold text-sm">{user.orderCount}</p>
              <p className="text-gray-600 text-xs">{t('admin.orders')}</p>
            </div>
            <div className="text-right">
              <p className="text-[#e8ff00] font-semibold text-sm">€{user.totalSpent.toFixed(2)}</p>
              <p className="text-gray-600 text-xs">{t('admin.totalSpent')}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-300 text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
              <p className="text-gray-600 text-xs">{t('admin.registered')}</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Mobile stats */}
      <div className="sm:hidden flex gap-4 px-6 pb-3 text-xs">
        <span className="text-gray-500">{user.orderCount} {t('admin.orders')}</span>
        <span className="text-[#e8ff00]">€{user.totalSpent.toFixed(2)}</span>
        <span className="text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Orders expanded */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-white/10">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {t('admin.loadingOrders')}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-gray-600 text-sm py-4">{t('admin.noOrders')}</p>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  {orders.map((o) => <OrderRow key={o.id} order={o} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AdminPage() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const isAdmin = isAuthenticated() && user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    api.get<AdminUser[]>('/admin/users')
      .then(({ data }) => setUsers(data))
      .catch(() => setError(t('admin.loadError')))
      .finally(() => setLoading(false))
  }, [isAdmin])

  // Guard (after all hooks)
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  const totalUsers = users.length
  const totalOrders = users.reduce((s, u) => s + u.orderCount, 0)
  const totalRevenue = users.reduce((s, u) => s + u.totalSpent, 0)

  return (
    <div className="min-h-screen py-28 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p className="text-[#e8ff00] text-xs font-bold uppercase tracking-[0.25em] mb-2">
            {t('admin.tag')}
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white">{t('admin.title')}</h1>
          <p className="text-gray-500 mt-2">{t('admin.subtitle')}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { label: t('admin.statUsers'), value: totalUsers },
            { label: t('admin.statOrders'), value: totalOrders },
            { label: t('admin.statRevenue'), value: `€${totalRevenue.toFixed(2)}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4">
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-6"
        >
          <input
            type="text"
            placeholder={t('admin.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/40 transition-colors"
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-3 text-gray-500 py-20 justify-center">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t('admin.loading')}
          </div>
        ) : error ? (
          <p className="text-red-400 text-center py-20">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-600 text-center py-20">{t('admin.noResults')}</p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            {filtered.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <UserCard user={u} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
