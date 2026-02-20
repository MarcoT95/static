import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import api from '../lib/axios'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import type { SavedPaymentMethod, CartItem, ProductSpecs } from '../types'

const CHECKOUT_SPECS_FALLBACK: Record<string, { height: string; width: string; weight: string; load: string; material: string }> = {
  'parallette-s': {
    height: '30 cm',
    width: '42 cm',
    weight: '1.8 kg',
    load: '200 kg',
    material: 'Acciaio C45',
  },
  'parallette-m': {
    height: '40 cm',
    width: '50 cm',
    weight: '2.6 kg',
    load: '250 kg',
    material: 'Acciaio C45 + Alluminio',
  },
  'parallette-l': {
    height: '50 cm',
    width: '58 cm',
    weight: '4.2 kg',
    load: '300 kg',
    material: 'Full Steel C45',
  },
}

type CheckoutPdfItem = {
  name: string
  quantity: number
  unitPrice: number
  specs?: ProductSpecs
}

export default function CheckoutPage() {
  const bankTransferInfo = {
    iban: 'IT60X0542811101000000123456',
    holder: 'Static S.r.l.',
    reason: 'Ordine STATIC - Nome Cognome',
  }

  const navigate = useNavigate()
  const { items, total, clearCart } = useCartStore()
  const { isAuthenticated, user, updateUser } = useAuthStore()
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [shippingAddress, setShippingAddress] = useState(user?.address || '')
  const [sameBillingAsShipping, setSameBillingAsShipping] = useState(true)
  const [billingAddress, setBillingAddress] = useState(user?.billingAddress || '')
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([])
  const [useSavedPaymentMethod, setUseSavedPaymentMethod] = useState(false)
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [saveMyDataForFuture, setSaveMyDataForFuture] = useState(false)
  const [savePaymentMethodForFuture, setSavePaymentMethodForFuture] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null)
  const [isReviewStep, setIsReviewStep] = useState(false)
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null)
  const [invoiceFileName, setInvoiceFileName] = useState('')
  const [orderSummaryPdfUrl, setOrderSummaryPdfUrl] = useState<string | null>(null)
  const [orderSummaryFileName, setOrderSummaryFileName] = useState('')
  const [pdfViewer, setPdfViewer] = useState<{ title: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState('')
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<CartItem | null>(null)
  const activeSavedMethod = savedPaymentMethods.find((method) => method.id === selectedSavedMethodId)
  const outOfStockItems = items.filter((item) => item.product.stock <= 0 || item.quantity > item.product.stock)
  const hasOutOfStockItems = outOfStockItems.length > 0
  const selectedSummarySpecs = selectedSummaryItem
    ? (selectedSummaryItem.product.specs ?? CHECKOUT_SPECS_FALLBACK[selectedSummaryItem.product.slug])
    : undefined

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const isValidFutureExpiry = (value: string) => {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) return false
    const [monthPart, yearPart] = value.split('/')
    const month = Number(monthPart)
    const year = Number(`20${yearPart}`)
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    if (year < currentYear) return false
    if (year === currentYear && month < currentMonth) return false
    return true
  }

  const inferCardBrand = (digits: string) => {
    if (digits.startsWith('4')) return 'Visa'
    if (/^5[1-5]/.test(digits)) return 'Mastercard'
    if (/^3[47]/.test(digits)) return 'Amex'
    return 'Carta'
  }

  const maskEmail = (value: string) => {
    const [local, domain] = value.split('@')
    if (!local || !domain) return '***@***'
    if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`
    return `${local.slice(0, 2)}***@${domain}`
  }

  const generateInvoicePdf = (params: {
    orderId: number
    orderDate: Date
    itemsSnapshot: CheckoutPdfItem[]
    totalSnapshot: number
    emailValue: string
    phoneValue: string
    shippingAddressValue: string
    billingAddressValue: string
    paymentLabel: string
    notesValue: string
  }) => {
    const doc = new jsPDF()
    const invoiceCode = `INV-${params.orderId}-${params.orderDate.getTime().toString().slice(-6)}`
    const safeDate = params.orderDate.toLocaleDateString('it-IT')

    doc.setFontSize(20)
    doc.text('STATIC - Fattura', 14, 18)

    doc.setFontSize(11)
    doc.text(`Fattura: ${invoiceCode}`, 14, 28)
    doc.text(`Ordine: #${params.orderId}`, 14, 34)
    doc.text(`Data: ${safeDate}`, 14, 40)

    doc.text('Cliente', 14, 52)
    doc.text(`Email: ${params.emailValue}`, 14, 58)
    doc.text(`Telefono: ${params.phoneValue}`, 14, 64)
    doc.text(`Spedizione: ${params.shippingAddressValue}`, 14, 70)
    doc.text(`Fatturazione: ${params.billingAddressValue}`, 14, 76)
    doc.text(`Pagamento: ${params.paymentLabel}`, 14, 82)

    let y = 94
    doc.text('Dettaglio prodotti', 14, y)
    y += 8

    params.itemsSnapshot.forEach((line, index) => {
      const specsText = line.specs
        ? `Caratteristiche: H ${line.specs.height} • W ${line.specs.width} • Peso ${line.specs.weight} • Portata ${line.specs.load} • Materiale ${line.specs.material}`
        : 'Caratteristiche: n/d'
      const wrappedSpecs = doc.splitTextToSize(specsText, 148)
      const amount = (line.unitPrice * line.quantity).toFixed(2)

      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.text(`${index + 1}. ${line.name} x${line.quantity}`, 14, y)
      doc.text(`EUR ${amount}`, 170, y, { align: 'right' })
      y += 6
      doc.setFontSize(9)
      doc.text(wrappedSpecs, 18, y)
      y += (wrappedSpecs.length * 4.5) + 4
      doc.setFontSize(11)

      if (y > 265) {
        doc.addPage()
        y = 20
      }
    })

    y += 6
    doc.setFontSize(12)
    doc.text(`Totale: EUR ${params.totalSnapshot.toFixed(2)}`, 170, y, { align: 'right' })

    if (params.notesValue.trim()) {
      y += 10
      doc.setFontSize(10)
      const wrappedNotes = doc.splitTextToSize(`Note: ${params.notesValue}`, 180)
      doc.text(wrappedNotes, 14, y)
    }

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    return { url, blob, fileName: `${invoiceCode}.pdf` }
  }

  const generateOrderSummaryPdf = (params: {
    orderId: number
    orderDate: Date
    itemsSnapshot: CheckoutPdfItem[]
    totalSnapshot: number
  }) => {
    const doc = new jsPDF()
    const summaryCode = `RIEP-${params.orderId}-${params.orderDate.getTime().toString().slice(-6)}`
    const safeDate = params.orderDate.toLocaleDateString('it-IT')

    doc.setFontSize(20)
    doc.text('STATIC - Riepilogo Ordine', 14, 18)
    doc.setFontSize(11)
    doc.text(`Riepilogo: ${summaryCode}`, 14, 28)
    doc.text(`Ordine: #${params.orderId}`, 14, 34)
    doc.text(`Data: ${safeDate}`, 14, 40)

    let y = 52
    params.itemsSnapshot.forEach((line, index) => {
      const lineTotal = (line.unitPrice * line.quantity).toFixed(2)
      const specsText = line.specs
        ? `Altezza ${line.specs.height}, Larghezza ${line.specs.width}, Peso ${line.specs.weight}, Portata ${line.specs.load}, Materiale ${line.specs.material}`
        : 'Caratteristiche non disponibili'
      const wrappedSpecs = doc.splitTextToSize(specsText, 165)

      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(11)
      doc.text(`${index + 1}. ${line.name}`, 14, y)
      y += 6
      doc.setFontSize(10)
      doc.text(`Quantità: ${line.quantity}  |  Prezzo unitario: EUR ${line.unitPrice.toFixed(2)}  |  Totale riga: EUR ${lineTotal}`, 18, y)
      y += 5
      doc.text(wrappedSpecs, 18, y)
      y += (wrappedSpecs.length * 4.5) + 5
    })

    doc.setFontSize(12)
    doc.text(`Totale ordine: EUR ${params.totalSnapshot.toFixed(2)}`, 170, Math.min(y + 2, 285), { align: 'right' })

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    return { url, blob, fileName: `${summaryCode}.pdf` }
  }

  const blobToBase64 = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(arrayBuffer)
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index])
    }
    return window.btoa(binary)
  }

  useEffect(() => {
    if (!isAuthenticated()) return

    const syncCheckoutData = async () => {
      try {
        const res = await api.get('/auth/me')
        const me = res.data
        updateUser(me)
        setEmail(me.email ?? '')
        setPhone(me.phone ?? '')
        setShippingAddress(me.address ?? '')
        setBillingAddress(me.billingAddress ?? '')
        const methods = Array.isArray(me.paymentMethods) ? (me.paymentMethods as SavedPaymentMethod[]) : []
        const ordered = [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        setSavedPaymentMethods(ordered)
        if (ordered.length > 0) {
          setUseSavedPaymentMethod(true)
          setSelectedSavedMethodId(ordered[0].id)
          setPaymentMethod(ordered[0].method)
        }
      } catch {
        setError('Errore nel caricamento dei metodi di pagamento')
      }
    }

    void syncCheckoutData()
  }, [isAuthenticated, updateUser])

  useEffect(() => {
    return () => {
      if (invoicePdfUrl) {
        URL.revokeObjectURL(invoicePdfUrl)
      }
    }
  }, [invoicePdfUrl])

  const redirectToPaypal = () => {
    const email = (useSavedPaymentMethod && activeSavedMethod?.method === 'paypal'
      ? activeSavedMethod.paypalEmail ?? ''
      : paypalEmail).trim().toLowerCase()
    if (!useSavedPaymentMethod && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Inserisci una email PayPal valida')
      return
    }
    const target = email
      ? `https://www.paypal.com/signin?email=${encodeURIComponent(email)}`
      : 'https://www.paypal.com/signin'
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  const copyText = async (value: string, key: 'iban' | 'reason') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      setTimeout(() => setCopiedField(''), 1500)
    } catch {
      setError('Impossibile copiare negli appunti')
    }
  }

  const removeSavedPaymentMethod = async (id: string) => {
    const filtered = savedPaymentMethods.filter((method) => method.id !== id)
    const nextMethods = filtered.map((method) => ({ ...method }))
    if (nextMethods.length > 0 && !nextMethods.some((method) => method.isDefault)) {
      nextMethods[0].isDefault = true
    }

    setError(null)
    try {
      const res = await api.patch('/auth/me', { paymentMethods: nextMethods })
      const updatedMethods = Array.isArray(res.data?.paymentMethods) ? (res.data.paymentMethods as SavedPaymentMethod[]) : []
      const ordered = [...updatedMethods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      setSavedPaymentMethods(ordered)
      updateUser(res.data)

      if (selectedSavedMethodId === id) {
        if (ordered.length > 0) {
          setSelectedSavedMethodId(ordered[0].id)
          setPaymentMethod(ordered[0].method)
          setUseSavedPaymentMethod(true)
        } else {
          setSelectedSavedMethodId('')
          setUseSavedPaymentMethod(false)
          setPaymentMethod('card')
        }
      }
    } catch {
      setError('Errore nella rimozione del metodo salvato')
    }
  }

  const getCheckoutContext = () => {
    const finalBillingAddress = sameBillingAsShipping ? shippingAddress : billingAddress
    const selectedSavedMethod = savedPaymentMethods.find((method) => method.id === selectedSavedMethodId)
    const methodForOrder = useSavedPaymentMethod && selectedSavedMethod ? selectedSavedMethod.method : paymentMethod
    const methodLabel = useSavedPaymentMethod && selectedSavedMethod
      ? selectedSavedMethod.maskedLabel
      : (methodForOrder === 'card'
          ? `${inferCardBrand(cardNumber.replace(/\D/g, ''))} • ****${cardNumber.replace(/\D/g, '').slice(-4)}`
          : methodForOrder === 'paypal'
            ? `PayPal • ${paypalEmail.trim().toLowerCase()}`
            : `Bonifico su ${bankTransferInfo.iban} intestato a ${bankTransferInfo.holder}`)

    return { finalBillingAddress, selectedSavedMethod, methodForOrder, methodLabel }
  }

  const validateCheckoutInputs = () => {
    if (!isAuthenticated()) {
      navigate('/login')
      return false
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Inserisci una email valida')
      return false
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('Inserisci un numero di telefono valido')
      return false
    }

    if (!shippingAddress.trim()) {
      setError('Inserisci un indirizzo di spedizione')
      return false
    }

    const { finalBillingAddress, selectedSavedMethod } = getCheckoutContext()
    if (!finalBillingAddress.trim()) {
      setError('Inserisci un indirizzo di fatturazione')
      return false
    }

    if (useSavedPaymentMethod) {
      if (!selectedSavedMethod) {
        setError('Seleziona un metodo salvato oppure inseriscine uno nuovo')
        return false
      }
      if (selectedSavedMethod.method === 'card' && !/^\d{3}$/.test(cardCvv)) {
        setError('Inserisci un CVV valido')
        return false
      }
    }

    if (!useSavedPaymentMethod && paymentMethod === 'card') {
      const digits = cardNumber.replace(/\D/g, '')
      if (!cardName.trim()) {
        setError('Inserisci il nome sulla carta')
        return false
      }
      if (digits.length !== 16 || !/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardNumber.trim())) {
        setError('Numero carta non valido: usa 16 cifre nel formato 1234 5678 9012 3456')
        return false
      }
      if (!isValidFutureExpiry(cardExpiry)) {
        setError('Scadenza non valida (MM/AA)')
        return false
      }
      if (!/^\d{3}$/.test(cardCvv)) {
        setError('Inserisci un CVV valido')
        return false
      }
    }

    if (!useSavedPaymentMethod && paymentMethod === 'paypal' && !/^\S+@\S+\.\S+$/.test(paypalEmail.trim())) {
      setError('Inserisci una email PayPal valida')
      return false
    }

    if (items.length === 0) {
      setError('Il carrello è vuoto')
      return false
    }

    if (hasOutOfStockItems) {
      setError('Prodotto terminato: aggiorna il carrello per continuare.')
      return false
    }

    setError(null)
    return true
  }

  const persistCheckoutData = async (finalBillingAddress: string) => {
    if (!isAuthenticated()) return true
    if (!(saveMyDataForFuture || (!useSavedPaymentMethod && savePaymentMethodForFuture))) return true

    try {
      const meRes = await api.get('/auth/me')
      const me = meRes.data
      const updatePayload: {
        email?: string
        phone?: string
        address?: string
        billingAddress?: string
        paymentMethods?: SavedPaymentMethod[]
      } = {}

      if (saveMyDataForFuture) {
        updatePayload.email = email.trim()
        updatePayload.phone = phone.trim()
        updatePayload.address = shippingAddress.trim()
        updatePayload.billingAddress = finalBillingAddress.trim()
      }

      if (!useSavedPaymentMethod && savePaymentMethodForFuture) {
        const existingMethods = Array.isArray(me.paymentMethods) ? (me.paymentMethods as SavedPaymentMethod[]) : []
        let newMethod: SavedPaymentMethod | null = null

        if (paymentMethod === 'card') {
          const digits = cardNumber.replace(/\D/g, '')
          const brand = inferCardBrand(digits)
          const last4 = digits.slice(-4)
          const alreadyExists = existingMethods.some((method) => (
            method.method === 'card'
            && method.cardBrand === brand
            && method.cardLast4 === last4
            && method.cardExpiry === cardExpiry
          ))

          if (!alreadyExists) {
            newMethod = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              method: 'card',
              maskedLabel: `${brand} • **** **** **** ${last4} • ${cardExpiry}`,
              isDefault: existingMethods.length === 0,
              cardBrand: brand,
              cardLast4: last4,
              cardExpiry,
            }
          }
        }

        if (paymentMethod === 'paypal') {
          const normalizedEmail = paypalEmail.trim().toLowerCase()
          const alreadyExists = existingMethods.some((method) => (
            method.method === 'paypal'
            && method.paypalEmail?.toLowerCase() === normalizedEmail
          ))

          if (!alreadyExists) {
            newMethod = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              method: 'paypal',
              maskedLabel: `PayPal • ${maskEmail(normalizedEmail)}`,
              isDefault: existingMethods.length === 0,
              paypalEmail: normalizedEmail,
            }
          }
        }

        if (paymentMethod === 'bank') {
          const bankLast4 = bankTransferInfo.iban.slice(-4)
          const alreadyExists = existingMethods.some((method) => (
            method.method === 'bank' && method.bankIbanLast4 === bankLast4
          ))

          if (!alreadyExists) {
            newMethod = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              method: 'bank',
              maskedLabel: `Bonifico • ${'*'.repeat(Math.max(bankTransferInfo.iban.length - 4, 4))}${bankLast4}`,
              isDefault: existingMethods.length === 0,
              bankIbanLast4: bankLast4,
            }
          }
        }

        if (newMethod) {
          updatePayload.paymentMethods = [...existingMethods, newMethod]
        }
      }

      if (Object.keys(updatePayload).length > 0) {
        const updateRes = await api.patch('/auth/me', updatePayload)
        updateUser(updateRes.data)
        const updatedMethods = Array.isArray(updateRes.data?.paymentMethods) ? (updateRes.data.paymentMethods as SavedPaymentMethod[]) : []
        const ordered = [...updatedMethods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        setSavedPaymentMethods(ordered)
      }

      return true
    } catch {
      setError('Errore nel salvataggio dei dati profilo/metodo')
      return false
    }
  }

  const goToReview = async () => {
    if (!validateCheckoutInputs()) return
    const { finalBillingAddress } = getCheckoutContext()
    const saved = await persistCheckoutData(finalBillingAddress)
    if (!saved) return
    setIsReviewStep(true)
  }

  const placeOrder = async () => {
    if (!validateCheckoutInputs()) {
      return
    }

    const { finalBillingAddress, methodForOrder, methodLabel } = getCheckoutContext()

    setLoading(true)
    setError(null)
    try {
      const orderDate = new Date()
      const itemsSnapshot = items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        specs: item.product.specs ?? CHECKOUT_SPECS_FALLBACK[item.product.slug],
      }))
      const totalSnapshot = total()

      const payload = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        shippingAddress,
        notes: [
          notes.trim(),
          `Contatto: ${email} / ${phone}`,
          `Metodo pagamento: ${methodLabel}`,
          methodForOrder === 'card' ? `CVV fornito: ${'*'.repeat(cardCvv.length)}` : '',
          `Indirizzo fatturazione: ${finalBillingAddress}`,
        ].filter(Boolean).join(' | '),
      }

      const res = await api.post('/orders', payload)
      const createdOrderId = Number(res.data?.id ?? 0)

      if (invoicePdfUrl) {
        URL.revokeObjectURL(invoicePdfUrl)
      }
      if (orderSummaryPdfUrl) {
        URL.revokeObjectURL(orderSummaryPdfUrl)
      }

      if (createdOrderId > 0) {
        const invoice = generateInvoicePdf({
          orderId: createdOrderId,
          orderDate,
          itemsSnapshot,
          totalSnapshot,
          emailValue: email,
          phoneValue: phone,
          shippingAddressValue: shippingAddress,
          billingAddressValue: finalBillingAddress,
          paymentLabel: methodLabel,
          notesValue: notes,
        })
        setInvoicePdfUrl(invoice.url)
        setInvoiceFileName(invoice.fileName)

        const summary = generateOrderSummaryPdf({
          orderId: createdOrderId,
          orderDate,
          itemsSnapshot,
          totalSnapshot,
        })
        setOrderSummaryPdfUrl(summary.url)
        setOrderSummaryFileName(summary.fileName)

        try {
          const [invoiceBase64, summaryBase64] = await Promise.all([
            blobToBase64(invoice.blob),
            blobToBase64(summary.blob),
          ])

          await api.post(`/orders/${createdOrderId}/documents`, {
            documents: [
              {
                type: 'invoice',
                fileName: invoice.fileName,
                mimeType: 'application/pdf',
                dataBase64: invoiceBase64,
              },
              {
                type: 'summary',
                fileName: summary.fileName,
                mimeType: 'application/pdf',
                dataBase64: summaryBase64,
              },
            ],
          })
        } catch {
          setError('Ordine confermato, ma salvataggio documenti non riuscito')
        }
      }

      setSuccessOrderId(createdOrderId > 0 ? createdOrderId : null)
      clearCart()
      setCardName('')
      setCardNumber('')
      setCardExpiry('')
      setCardCvv('')
      setSaveMyDataForFuture(false)
      setSavePaymentMethodForFuture(false)
      setPaypalEmail('')
    } catch (err: unknown) {
      const backendMessage = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message

      if (Array.isArray(backendMessage) && backendMessage.length > 0) {
        setError(String(backendMessage[0]))
      } else if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
        if (backendMessage.includes('Prodotti non validi') || backendMessage.includes('non disponibili')) {
          setError('Alcuni prodotti non sono più disponibili. Aggiorna il carrello e riprova.')
        } else {
          setError(backendMessage)
        }
      } else {
        setError('Errore durante la creazione dell\'ordine')
      }
    } finally {
      setLoading(false)
    }
  }

  const { finalBillingAddress, methodForOrder, methodLabel } = getCheckoutContext()

  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.25em] mb-3">Checkout</p>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-none">Completa il tuo ordine</h1>
        </motion.div>

        {successOrderId ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full flex flex-col">
              <h2 className="text-3xl font-black text-white mb-3">Ordine confermato</h2>
              <p className="text-gray-400 mb-2">ID ordine: <span className="text-[#e8ff00] font-bold">#{successOrderId}</span></p>
              <p className="text-gray-500 mb-6">Fattura e riepilogo ordine generati automaticamente.</p>

              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                {invoicePdfUrl && (
                  <a
                    href={invoicePdfUrl}
                    download={invoiceFileName || `fattura-${successOrderId}.pdf`}
                    className="inline-block text-center bg-[#e8ff00] !text-black hover:!text-black font-bold text-sm px-4 py-2.5 rounded-full"
                  >
                    Download
                  </a>
                )}
                {invoicePdfUrl && (
                  <button
                    type="button"
                    onClick={() => setPdfViewer({ title: 'Fattura PDF', url: invoicePdfUrl })}
                    className="inline-block text-center border border-white/20 text-white font-bold text-sm px-4 py-2.5 rounded-full hover:bg-white/10"
                  >
                    Visualizza
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full flex flex-col">
              <h2 className="text-3xl font-black text-white mb-3">Riepilogo</h2>
              <p className="text-gray-400 mb-2">ID ordine: <span className="text-[#e8ff00] font-bold">#{successOrderId}</span></p>
              <p className="text-gray-500 mb-6">Riepilogo ordine PDF pronto per download o visualizzazione.</p>

              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                {orderSummaryPdfUrl && (
                  <a
                    href={orderSummaryPdfUrl}
                    download={orderSummaryFileName || `riepilogo-${successOrderId}.pdf`}
                    className="inline-block text-center bg-[#e8ff00] !text-black hover:!text-black font-bold text-sm px-4 py-2.5 rounded-full"
                  >
                    Download
                  </a>
                )}
                {orderSummaryPdfUrl && (
                  <button
                    type="button"
                    onClick={() => setPdfViewer({ title: 'Riepilogo ordine PDF', url: orderSummaryPdfUrl })}
                    className="inline-block text-center border border-white/20 text-white font-bold text-sm px-4 py-2.5 rounded-full hover:bg-white/10"
                  >
                    Visualizza
                  </button>
                )}
              </div>
            </div>
            </div>

            <div className="flex justify-center">
              <Link to="/shop" className="inline-block border border-white/20 text-white font-bold px-6 py-3 rounded-full hover:bg-white/10">
                Torna allo shop
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-white font-semibold mb-3">Contatti</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Telefono</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50"
                      placeholder="+39 333 1234567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Indirizzo di spedizione</label>
                <input
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50"
                  placeholder="Via Roma 10, Milano"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 block">Indirizzo di fatturazione</label>
                  <label className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameBillingAsShipping}
                      onChange={(e) => setSameBillingAsShipping(e.target.checked)}
                      className="accent-[#e8ff00]"
                    />
                    Uguale alla spedizione
                  </label>
                </div>
                <input
                  value={sameBillingAsShipping ? shippingAddress : billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  disabled={sameBillingAsShipping}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 disabled:opacity-60"
                  placeholder="Via Fatturazione 25, Milano"
                />
                <label className="mt-3 text-sm text-gray-400 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveMyDataForFuture}
                    onChange={(e) => setSaveMyDataForFuture(e.target.checked)}
                    className="accent-[#e8ff00]"
                  />
                  Salva i miei dati per i prossimi acquisti
                </label>
              </div>

              {!isReviewStep ? (
                <>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Step 3 - Conferma pagamento</label>
                    {savedPaymentMethods.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-sm text-gray-400">Lista metodi salvati</p>
                        {savedPaymentMethods.map((method) => (
                          <div key={method.id} className="flex items-start justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={useSavedPaymentMethod && selectedSavedMethodId === method.id}
                                onChange={() => {
                                  setUseSavedPaymentMethod(true)
                                  setSelectedSavedMethodId(method.id)
                                  setPaymentMethod(method.method)
                                }}
                                className="accent-[#e8ff00] mt-1"
                              />
                              <span>
                                <span className="text-white text-sm block">{method.maskedLabel}</span>
                                <span className="text-xs text-gray-500">{method.isDefault ? 'Predefinito' : 'Salvato'}</span>
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeSavedPaymentMethod(method.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setUseSavedPaymentMethod(false)}
                          className="text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                        >
                          Inserisci nuovo metodo
                        </button>
                      </div>
                    )}

                    {!useSavedPaymentMethod && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {[
                        { key: 'card', label: 'Carta' },
                        { key: 'paypal', label: 'PayPal' },
                        { key: 'bank', label: 'Bonifico' },
                      ].map((method) => (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => setPaymentMethod(method.key as 'card' | 'paypal' | 'bank')}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                            paymentMethod === method.key
                              ? 'border-[#e8ff00] bg-[#e8ff00]/10 text-[#e8ff00]'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                    )}

                    {((useSavedPaymentMethod && activeSavedMethod?.method === 'card') || (!useSavedPaymentMethod && paymentMethod === 'card')) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!useSavedPaymentMethod && (
                        <>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">Nome sulla carta</label>
                          <input
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            placeholder="Mario Rossi"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">Numero carta</label>
                          <input
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            placeholder="1234 5678 9012 3456"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">Scadenza (MM/AA)</label>
                          <input
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            placeholder="MM/AA"
                          />
                        </div>
                        </>
                        )}
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">CVV</label>
                          <input
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            placeholder="123"
                          />
                        </div>
                      </div>
                    )}

                    {((useSavedPaymentMethod && activeSavedMethod?.method === 'paypal') || (!useSavedPaymentMethod && paymentMethod === 'paypal')) && (
                      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 space-y-3">
                        {!useSavedPaymentMethod && (
                          <>
                            <label className="text-sm text-gray-400 block">Email PayPal</label>
                            <input
                              value={paypalEmail}
                              onChange={(e) => setPaypalEmail(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                              placeholder="you@example.com"
                            />
                          </>
                        )}
                        <p className="text-sm text-gray-300">Accedi a PayPal: l'autenticazione avviene direttamente sul provider.</p>
                        <button
                          type="button"
                          onClick={redirectToPaypal}
                          className="text-sm px-4 py-2 rounded-lg border border-[#e8ff00]/40 text-[#e8ff00] hover:bg-[#e8ff00]/10"
                        >
                          Vai a PayPal
                        </button>
                      </div>
                    )}
                  </div>

                  {((useSavedPaymentMethod && activeSavedMethod?.method === 'bank') || (!useSavedPaymentMethod && paymentMethod === 'bank')) && (
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 space-y-3">
                      <p className="text-sm text-gray-300">Bonifico bancario (dati in sola lettura)</p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">IBAN</label>
                        <input value={bankTransferInfo.iban} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90" />
                        <button
                          type="button"
                          onClick={() => copyText(bankTransferInfo.iban, 'iban')}
                          className="mt-2 text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                        >
                          {copiedField === 'iban' ? 'Copiato' : 'Copia IBAN'}
                        </button>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Intestatario</label>
                        <input value={bankTransferInfo.holder} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Causale</label>
                        <input value={bankTransferInfo.reason} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90" />
                        <button
                          type="button"
                          onClick={() => copyText(bankTransferInfo.reason, 'reason')}
                          className="mt-2 text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                        >
                          {copiedField === 'reason' ? 'Copiato' : 'Copia causale'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!useSavedPaymentMethod && (
                    <label className="mt-3 text-sm text-gray-400 flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={savePaymentMethodForFuture}
                        onChange={(e) => setSavePaymentMethodForFuture(e.target.checked)}
                        className="accent-[#e8ff00]"
                      />
                      Salva questo metodo di pagamento nel tuo account
                    </label>
                  )}

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Note ordine (opzionale)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 resize-none"
                      placeholder="Citofono, orario consegna, ecc."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-wider">Riepilogo ordine</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">Contatti</p>
                      <p className="text-white">{email} • {phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Spedizione</p>
                      <p className="text-white">{shippingAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fatturazione</p>
                      <p className="text-white">{finalBillingAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pagamento</p>
                      <p className="text-white">{methodLabel}</p>
                    </div>
                    {methodForOrder === 'card' && (
                      <div>
                        <p className="text-gray-500">Sicurezza</p>
                        <p className="text-white">CVV inserito</p>
                      </div>
                    )}
                    {notes.trim() && (
                      <div>
                        <p className="text-gray-500">Note</p>
                        <p className="text-white">{notes}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewStep(false)}
                    className="text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                  >
                    Modifica dati
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {hasOutOfStockItems && <p className="text-red-400 text-sm">Prodotto terminato: aggiorna il carrello per continuare.</p>}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={isReviewStep ? placeOrder : goToReview}
                disabled={loading || hasOutOfStockItems}
                className="w-full bg-[#e8ff00] text-black font-black py-4 rounded-xl text-lg disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Invio ordine...' : isReviewStep ? 'Procedi al pagamento' : 'Vai al riepilogo ordine'}
              </motion.button>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="text-white font-black text-xl mb-4">Riepilogo ordine</h3>
              <div className="space-y-3 mb-5">
                {items.length === 0 ? (
                  <p className="text-gray-500 text-sm">Carrello vuoto</p>
                ) : (
                  items.map((item) => {
                    const isOutOfStock = item.product.stock <= 0 || item.quantity > item.product.stock
                    return (
                      <div
                        key={item.product.id}
                        onClick={() => setSelectedSummaryItem(item)}
                        className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                            {item.product.images?.[0] ? (
                              <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`${isOutOfStock ? 'text-red-400' : 'text-white'} font-semibold text-sm truncate`}>
                              {item.product.name}
                            </p>
                            <p className="text-gray-500 text-xs">Quantità: {item.quantity}</p>
                            {isOutOfStock && <p className="text-red-400 text-xs mt-1">Prodotto terminato</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-[#e8ff00] font-bold text-sm">€{(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between text-lg font-bold">
                <span className="text-gray-400">Totale</span>
                <span className="text-[#e8ff00]">€{total().toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {pdfViewer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
              onClick={() => setPdfViewer(null)}
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
                    <button
                      type="button"
                      onClick={() => setPdfViewer(null)}
                      className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      ✕
                    </button>
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

          {selectedSummaryItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
              onClick={() => setSelectedSummaryItem(null)}
            >
              <motion.div
                initial={{ scale: 0.98, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.98, y: 20 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden max-w-xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative h-56 bg-[#1a1a1a]">
                  {selectedSummaryItem.product.images?.[0] && (
                    <img
                      src={selectedSummaryItem.product.images[0]}
                      alt={selectedSummaryItem.product.name}
                      className="w-full h-full object-cover object-center opacity-75"
                    />
                  )}
                  <button
                    onClick={() => setSelectedSummaryItem(null)}
                    className="absolute top-4 right-4 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <h3 className="text-white font-black text-2xl">{selectedSummaryItem.product.name}</h3>
                  {selectedSummaryItem.product.description && (
                    <p className="text-gray-400 text-sm leading-relaxed">{selectedSummaryItem.product.description}</p>
                  )}

                  {selectedSummarySpecs && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Altezza</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.height}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Larghezza</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.width}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Peso</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.weight}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Portata</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.load}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 col-span-2">
                        <p className="text-gray-500 text-xs">Materiale</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.material}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-gray-500 text-xs">Quantità</p>
                      <p className="text-white font-semibold">{selectedSummaryItem.quantity}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-gray-500 text-xs">Prezzo unitario</p>
                      <p className="text-white font-semibold">€{Number(selectedSummaryItem.product.price).toFixed(2)}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 col-span-2">
                      <p className="text-gray-500 text-xs">Totale riga</p>
                      <p className="text-[#e8ff00] font-black text-lg">€{(Number(selectedSummaryItem.product.price) * selectedSummaryItem.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
