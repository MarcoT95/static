import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/axios'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

type OrderItemLine = {
  id: number
  productId: number
  quantity: number
  unitPrice: number
  product?: {
    id: number
    name: string
  }
}

type OrderSummary = {
  id: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  items: OrderItemLine[]
  documents?: Array<{
    id: number
    type: 'invoice' | 'summary'
    fileName: string
    mimeType: string
    createdAt: string
  }>
}

export default function OrdersSummaryPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { syncFromBackend, toggleCart } = useCartStore()

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [reorderingId, setReorderingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pdfViewer, setPdfViewer] = useState<{ title: string; url: string; fileName: string } | null>(null)

  const ordersToComplete = orders.filter((order) => order.status === 'pending')
  const confirmedOrders = orders.filter((order) => order.status !== 'pending')

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    const loadOrders = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/orders')
        const rows = Array.isArray(res.data) ? res.data : []
        setOrders(rows)
      } catch {
        setError('Errore nel caricamento ordini')
      } finally {
        setLoading(false)
      }
    }

    void loadOrders()
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => {
      if (pdfViewer?.url) {
        URL.revokeObjectURL(pdfViewer.url)
      }
    }
  }, [pdfViewer])

  const base64ToBlob = (base64: string, mimeType: string) => {
    const binary = window.atob(base64)
    const length = binary.length
    const bytes = new Uint8Array(length)
    for (let index = 0; index < length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], { type: mimeType })
  }

  const fetchOrderDocument = async (orderId: number, type: 'invoice' | 'summary') => {
    const res = await api.get(`/orders/${orderId}/documents/${type}`)
    const payload = res.data as { fileName: string; mimeType: string; dataBase64: string }
    const blob = base64ToBlob(payload.dataBase64, payload.mimeType || 'application/pdf')
    const url = URL.createObjectURL(blob)
    return { url, fileName: payload.fileName || `${type}-${orderId}.pdf` }
  }

  const viewDocument = async (orderId: number, type: 'invoice' | 'summary', title: string) => {
    setError(null)
    try {
      const file = await fetchOrderDocument(orderId, type)
      if (pdfViewer?.url) {
        URL.revokeObjectURL(pdfViewer.url)
      }
      setPdfViewer({ title, url: file.url, fileName: file.fileName })
    } catch {
      setError('Documento non disponibile')
    }
  }

  const reorder = async (order: OrderSummary) => {
    if (!order.items || order.items.length === 0) {
      setError('Nessun prodotto disponibile per il riordino')
      return
    }

    setReorderingId(order.id)
    setError(null)
    setSuccess(null)

    try {
      await Promise.all(
        order.items.map((item) =>
          api.post('/cart/items', {
            productId: item.productId ?? item.product?.id,
            quantity: item.quantity,
          }),
        ),
      )

      await syncFromBackend()
      toggleCart()
      setSuccess(`Ordine #${order.id} aggiunto al carrello`)
    } catch {
      setError('Errore durante il riordino')
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.25em] mb-3">Ordini</p>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-none">Riepilogo ordini</h1>
        </motion.div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {success && <p className="text-[#e8ff00] text-sm mb-4">{success}</p>}

        {loading ? (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-gray-400">Caricamento ordini...</div>
        ) : orders.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <p className="text-gray-400 mb-4">Non hai ancora ordini.</p>
            <Link to="/shop" className="inline-block bg-[#e8ff00] !text-black hover:!text-black font-bold px-6 py-3 rounded-full">
              Vai allo shop
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-white font-black text-2xl mb-4">Ordini da completare</h2>
              {ordersToComplete.length === 0 ? (
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-gray-500">
                  Nessun ordine in corso.
                </div>
              ) : (
                <div className="space-y-4">
                  {ordersToComplete.map((order) => (
                    <div key={order.id} className="bg-[#111] border border-white/10 rounded-2xl p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Ordine #{order.id}</p>
                          <p className="text-white text-sm">{new Date(order.createdAt).toLocaleDateString('it-IT')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Stato</p>
                          <p className="text-yellow-300 font-semibold">In corso</p>
                          <p className="text-[#e8ff00] font-black mt-1">€{Number(order.total).toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">Ordine salvato ma non ancora completato.</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-white font-black text-2xl mb-4">I miei ordini</h2>
              {confirmedOrders.length === 0 ? (
                <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-gray-500">
                  Nessun ordine confermato.
                </div>
              ) : (
                <div className="space-y-4">
                  {confirmedOrders.map((order) => (
                    <div key={order.id} className="bg-[#111] border border-white/10 rounded-2xl p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Ordine #{order.id}</p>
                          <p className="text-white text-sm">{new Date(order.createdAt).toLocaleDateString('it-IT')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 text-xs uppercase tracking-wide">Stato</p>
                          <p className="text-white font-semibold capitalize">{order.status}</p>
                          <p className="text-[#e8ff00] font-black mt-1">€{Number(order.total).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-5">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm border-b border-white/5 pb-2">
                            <span className="text-gray-300">{item.product?.name ?? `Prodotto #${item.productId}`} × {item.quantity}</span>
                            <span className="text-white">€{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mb-5">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Documenti</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => viewDocument(order.id, 'invoice', `Fattura ordine #${order.id}`)}
                            className="border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/10 cursor-pointer"
                          >
                            Fattura
                          </button>
                          <button
                            type="button"
                            onClick={() => viewDocument(order.id, 'summary', `Riepilogo ordine #${order.id}`)}
                            className="border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/10 cursor-pointer"
                          >
                            Riepilogo
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => reorder(order)}
                        disabled={reorderingId === order.id}
                        className="bg-[#e8ff00] text-black font-bold px-5 py-2.5 rounded-full disabled:opacity-60 cursor-pointer"
                      >
                        {reorderingId === order.id ? 'Riordino...' : 'Riordina'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pdfViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => {
              if (pdfViewer.url) URL.revokeObjectURL(pdfViewer.url)
              setPdfViewer(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.98, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="bg-[#111] border border-white/10 rounded-3xl w-[75vw] h-[75vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <h3 className="text-white font-black text-xl">{pdfViewer.title}</h3>
                  <div className="flex items-center gap-2">
                    <a
                      href={pdfViewer.url}
                      download={pdfViewer.fileName}
                      className="bg-[#e8ff00] !text-black hover:!text-black text-sm font-semibold px-4 py-2 rounded-full"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (pdfViewer.url) URL.revokeObjectURL(pdfViewer.url)
                        setPdfViewer(null)
                      }}
                      className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <iframe
                  title={pdfViewer.title}
                  src={`${pdfViewer.url}#toolbar=1&view=FitH`}
                  className="w-full flex-1 bg-white"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
