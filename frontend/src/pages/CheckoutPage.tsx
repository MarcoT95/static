import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import api from '../lib/axios'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import type { SavedPaymentMethod, CartItem, ProductSpecs } from '../types'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const bankTransferInfo = {
    iban: 'IT60X0542811101000000123456',
    holder: 'Static S.r.l.',
  }

  const location = useLocation()
  const navigate = useNavigate()
  const { items, total, clearCart, syncFromBackend } = useCartStore()
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
  const [savingDraft, setSavingDraft] = useState(false)
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null)
  const [isReviewStep, setIsReviewStep] = useState(false)
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null)
  const [orderSummaryPdfUrl, setOrderSummaryPdfUrl] = useState<string | null>(null)
  const [invoiceFileName, setInvoiceFileName] = useState('')
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
  const draftOrderId = Number(new URLSearchParams(location.search).get('draftOrderId') ?? 0)

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
    const safeDate = params.orderDate.toLocaleDateString()

    doc.setFontSize(20)
    doc.text(`STATIC - ${t('pdf.invoice')}`, 14, 18)

    doc.setFontSize(11)
    doc.text(`${t('pdf.invoice')}: ${invoiceCode}`, 14, 28)
    doc.text(`${t('checkout.orderId')}: #${params.orderId}`, 14, 34)
    doc.text(`${t('pdf.date')}: ${safeDate}`, 14, 40)

    doc.text(t('pdf.client'), 14, 52)
    doc.text(`${t('auth.email')}: ${params.emailValue}`, 14, 58)
    doc.text(`${t('checkout.phone')}: ${params.phoneValue}`, 14, 64)
    doc.text(`${t('checkout.shippingAddress')}: ${params.shippingAddressValue}`, 14, 70)
    doc.text(`${t('checkout.billingAddress')}: ${params.billingAddressValue}`, 14, 76)
    doc.text(`${t('checkout.payment')}: ${params.paymentLabel}`, 14, 82)

    let y = 94
    doc.text(t('pdf.productDetails'), 14, y)
    y += 8

    params.itemsSnapshot.forEach((line, index) => {
      const specsText = line.specs
        ? `${t('product.specs.heightShort')}: ${line.specs.height} • ${t('product.specs.widthShort')}: ${line.specs.width} • ${t('product.specs.weightShort')}: ${line.specs.weight} • ${t('product.specs.loadShort')}: ${line.specs.load} • ${t('product.specs.material')}: ${line.specs.material}`
        : `${t('pdf.features')}: n/d`
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
    const safeDate = params.orderDate.toLocaleDateString()

    doc.setFontSize(20)
    doc.text(`STATIC - ${t('pdf.orderSummary')}`, 14, 18)
    doc.setFontSize(11)
    doc.text(`${t('pdf.summary')}: ${summaryCode}`, 14, 28)
    doc.text(`${t('checkout.orderId')}: #${params.orderId}`, 14, 34)
    doc.text(`${t('pdf.date')}: ${safeDate}`, 14, 40)

    let y = 52
    params.itemsSnapshot.forEach((line, index) => {
      const lineTotal = (line.unitPrice * line.quantity).toFixed(2)
      const specsText = line.specs
        ? `${t('product.specs.height')}: ${line.specs.height}, ${t('product.specs.width')}: ${line.specs.width}, ${t('product.specs.weight')}: ${line.specs.weight}, ${t('product.specs.load')}: ${line.specs.load}, ${t('product.specs.material')}: ${line.specs.material}`
        : t('pdf.featuresUnavailable')
      const wrappedSpecs = doc.splitTextToSize(specsText, 165)

      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(11)
      doc.text(`${index + 1}. ${line.name}`, 14, y)
      y += 6
      doc.setFontSize(10)
      doc.text(`${t('cart.quantity')}: ${line.quantity}  |  ${t('cart.unitPrice')}: EUR ${line.unitPrice.toFixed(2)}  |  ${t('cart.lineTotal')}: EUR ${lineTotal}`, 18, y)
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
        setError(t('errors.loadPaymentMethods'))
      }
    }

    void syncCheckoutData()
  }, [isAuthenticated, updateUser])

  useEffect(() => {
    if (!isAuthenticated()) return
    if (!draftOrderId) return

    const restoreDraft = async () => {
      try {
        const res = await api.get(`/orders/${draftOrderId}`)
        const draft = res.data
        if (draft?.status !== 'pending') return

        const data = draft.checkoutData ?? {}
        setEmail(data.email ?? '')
        setPhone(data.phone ?? '')
        setShippingAddress(data.shippingAddress ?? '')
        setSameBillingAsShipping(data.sameBillingAsShipping ?? true)
        setBillingAddress(data.billingAddress ?? '')
        setPaymentMethod(data.paymentMethod ?? 'card')
        setUseSavedPaymentMethod(!!data.useSavedPaymentMethod)
        setSelectedSavedMethodId(data.selectedSavedMethodId ?? '')
        setCardName(data.cardName ?? '')
        setCardNumber(data.cardNumber ?? '')
        setCardExpiry(data.cardExpiry ?? '')
        setPaypalEmail(data.paypalEmail ?? '')
        setNotes(data.notes ?? '')

        await clearCart()
        const draftItems = Array.isArray(draft.items) ? draft.items : []
        await Promise.all(
          draftItems.map((item: { productId: number; quantity: number }) =>
            api.post('/cart/items', { productId: item.productId, quantity: item.quantity }),
          ),
        )
        await syncFromBackend()
      } catch {
        setError(t('errors.cannotRestoreDraft'))
      }
    }

    void restoreDraft()
  }, [clearCart, draftOrderId, isAuthenticated, syncFromBackend])

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
      setError(t('errors.invalidPaypalEmail'))
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
      setError(t('errors.copyFailed'))
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
      setError(t('errors.removePaymentMethod'))
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
      setError(t('errors.invalidEmail'))
      return false
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError(t('errors.invalidPhone'))
      return false
    }

    if (!shippingAddress.trim()) {
      setError(t('errors.invalidShippingAddress'))
      return false
    }

    const { finalBillingAddress, selectedSavedMethod } = getCheckoutContext()
    if (!finalBillingAddress.trim()) {
      setError(t('errors.invalidBillingAddress'))
      return false
    }

    if (useSavedPaymentMethod) {
      if (!selectedSavedMethod) {
        setError(t('errors.selectOrProvidePaymentMethod'))
        return false
      }
      if (selectedSavedMethod.method === 'card' && !/^\d{3}$/.test(cardCvv)) {
        setError(t('errors.invalidCvv'))
        return false
      }
    }

    if (!useSavedPaymentMethod && paymentMethod === 'card') {
      const digits = cardNumber.replace(/\D/g, '')
      if (!cardName.trim()) {
        setError(t('errors.cardNameRequired'))
        return false
      }
      if (digits.length !== 16 || !/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardNumber.trim())) {
        setError(t('errors.invalidCardNumber'))
        return false
      }
      if (!isValidFutureExpiry(cardExpiry)) {
        setError(t('errors.invalidExpiry'))
        return false
      }
      if (!/^\d{3}$/.test(cardCvv)) {
        setError(t('errors.invalidCvv'))
        return false
      }
    }

    if (!useSavedPaymentMethod && paymentMethod === 'paypal' && !/^\S+@\S+\.\S+$/.test(paypalEmail.trim())) {
      setError(t('errors.invalidPaypalEmail'))
      return false
    }

    if (items.length === 0) {
      setError(t('cart.empty'))
      return false
    }

    if (hasOutOfStockItems) {
      setError(t('errors.outOfStockCart'))
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
          setError(t('errors.productsUnavailable'))
        } else {
          setError(backendMessage)
        }
      } else {
        setError(t('errors.orderCreationFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const saveAsPendingOrder = async () => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    if (items.length === 0) {
      setError(t('cart.empty'))
      return
    }

    const { finalBillingAddress } = getCheckoutContext()

    setSavingDraft(true)
    setError(null)
    try {
      await api.post('/orders/draft', {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        shippingAddress,
        notes: notes.trim(),
        checkoutData: {
          email,
          phone,
          shippingAddress,
          billingAddress: finalBillingAddress,
          sameBillingAsShipping,
          paymentMethod,
          useSavedPaymentMethod,
          selectedSavedMethodId,
          cardName,
          cardNumber,
          cardExpiry,
          paypalEmail,
          notes,
        },
      })

      navigate('/orders-summary')
    } catch {
      setError(t('errors.saveOrderDraft'))
    } finally {
      setSavingDraft(false)
    }
  }

  const { finalBillingAddress, methodForOrder, methodLabel } = getCheckoutContext()

  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-[0.25em] mb-3">{t('checkout.smallHeader')}</p>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-none">{t('checkout.title')}</h1>
        </motion.div>

        {successOrderId ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full flex flex-col">
              <h2 className="text-3xl font-black text-white mb-3">{t('checkout.orderConfirmed')}</h2>
              <p className="text-gray-400 mb-2">{t('checkout.orderId')}: <span className="text-[#e8ff00] font-bold">#{successOrderId}</span></p>
              <p className="text-gray-500 mb-6">{t('checkout.invoiceGenerated')}</p>

              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                {invoicePdfUrl && (
                  <a
                    href={invoicePdfUrl}
                    download={invoiceFileName || `${t('pdf.invoice').toLowerCase()}-${successOrderId}.pdf`}
                    className="inline-block text-center bg-[#e8ff00] !text-black hover:!text-black font-bold text-sm px-4 py-2.5 rounded-full"
                  >
                    {t('common.download')}
                  </a>
                )}
                {invoicePdfUrl && (
                  <button
                    type="button"
                    onClick={() => setPdfViewer({ title: t('checkout.invoicePdfTitle'), url: invoicePdfUrl })}
                    className="inline-block text-center border border-white/20 text-white font-bold text-sm px-4 py-2.5 rounded-full hover:bg-white/10"
                  >
                    {t('common.view')}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-full flex flex-col">
              <h2 className="text-3xl font-black text-white mb-3">{t('checkout.summaryTitle')}</h2>
              <p className="text-gray-400 mb-2">{t('checkout.orderId')}: <span className="text-[#e8ff00] font-bold">#{successOrderId}</span></p>
              <p className="text-gray-500 mb-6">{t('checkout.summaryPdfReady')}</p>

              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                {orderSummaryPdfUrl && (
                  <a
                    href={orderSummaryPdfUrl}
                    download={orderSummaryFileName || `${t('pdf.orderSummary').toLowerCase()}-${successOrderId}.pdf`}
                    className="inline-block text-center bg-[#e8ff00] !text-black hover:!text-black font-bold text-sm px-4 py-2.5 rounded-full"
                  >
                    {t('common.download')}
                  </a>
                )}
                {orderSummaryPdfUrl && (
                  <button
                    type="button"
                    onClick={() => setPdfViewer({ title: t('checkout.orderSummaryPdfTitle'), url: orderSummaryPdfUrl })}
                    className="inline-block text-center border border-white/20 text-white font-bold text-sm px-4 py-2.5 rounded-full hover:bg-white/10"
                  >
                    {t('common.view')}
                  </button>
                )}
              </div>
            </div>
            </div>

            <div className="flex justify-center">
              <Link to="/shop" className="inline-block border border-white/20 text-white font-bold px-6 py-3 rounded-full hover:bg-white/10">
                {t('checkout.backToShop')}
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
                    {t('checkout_extra.sameAsShipping')}
                  </label>
                </div>
                <input
                  value={sameBillingAsShipping ? shippingAddress : billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  disabled={sameBillingAsShipping}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 disabled:opacity-60"
                  placeholder={t('checkout_extra.billingPlaceholder')}
                />
                <label className="mt-3 text-sm text-gray-400 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveMyDataForFuture}
                    onChange={(e) => setSaveMyDataForFuture(e.target.checked)}
                    className="accent-[#e8ff00]"
                  />
                  {t('checkout.saveMyData')}
                </label>
              </div>

              {!isReviewStep ? (
                <>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">{t('checkout.step3')}</label>
                    {savedPaymentMethods.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-sm text-gray-400">{t('checkout.savedMethodsList')}</p>
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
                                <span className="text-xs text-gray-500">{method.isDefault ? t('checkout.default') : t('checkout.saved')}</span>
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeSavedPaymentMethod(method.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                            >
                              {t('checkout.remove')}
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setUseSavedPaymentMethod(false)}
                          className="text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                        >
                          {t('checkout.insertNewMethod')}
                        </button>
                      </div>
                    )}

                    {!useSavedPaymentMethod && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {[
                        { key: 'card', label: t('payment.card') },
                        { key: 'paypal', label: 'PayPal' },
                        { key: 'bank', label: t('payment.bank') },
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
                          <label className="text-sm text-gray-400 mb-2 block">{t('checkout.cardName')}</label>
                          <input
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            placeholder="Mario Rossi"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">{t('checkout.cardNumber')}</label>
                          <input
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            placeholder="1234 5678 9012 3456"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-2 block">{t('checkout.cardExpiry')}</label>
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
                          <label className="text-sm text-gray-400 mb-2 block">{t('checkout.cvv')}</label>
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
                            <label className="text-sm text-gray-400 block">{t('checkout_extra.paypalEmail')}</label>
                            <input
                              value={paypalEmail}
                              onChange={(e) => setPaypalEmail(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                              placeholder="you@example.com"
                            />
                          </>
                        )}
                        <p className="text-sm text-gray-300">{t('checkout.paypalInfo')}</p>
                        <button
                          type="button"
                          onClick={redirectToPaypal}
                          className="text-sm px-4 py-2 rounded-lg border border-[#e8ff00]/40 text-[#e8ff00] hover:bg-[#e8ff00]/10"
                        >
                          {t('checkout.goToPaypal')}
                        </button>
                      </div>
                    )}
                  </div>

                  {((useSavedPaymentMethod && activeSavedMethod?.method === 'bank') || (!useSavedPaymentMethod && paymentMethod === 'bank')) && (
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 space-y-3">
                      <p className="text-sm text-gray-300">{t('checkout.bankInfo')}</p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t('bank.iban')}</label>
                        <input value={bankTransferInfo.iban} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90" />
                        <button
                          type="button"
                          onClick={() => copyText(bankTransferInfo.iban, 'iban')}
                          className="mt-2 text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                        >
                          {copiedField === 'iban' ? t('common.copied') : t('checkout.copyIban')}
                        </button>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t('bank.holder')}</label>
                        <input value={bankTransferInfo.holder} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t('bank.reason')}</label>
                        <input
                          value={t('bank.reasonTemplate', { name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}` }).trim()}
                          readOnly
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90"
                        />
                        <button
                          type="button"
                          onClick={() => copyText(t('bank.reasonTemplate', { name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}` }).trim(), 'reason')}
                          className="mt-2 text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                        >
                          {copiedField === 'reason' ? t('common.copied') : t('checkout.copyReason')}
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
                      {t('checkout.savePaymentMethodForFuture')}
                    </label>
                  )}

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">{t('checkout.notes')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#e8ff00]/50 resize-none"
                      placeholder={t('checkout.notesPlaceholder')}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-[#e8ff00] text-sm font-bold uppercase tracking-wider">{t('checkout.orderSummarySmall')}</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">{t('checkout.contacts')}</p>
                      <p className="text-white">{email} • {phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('checkout.shipping')}</p>
                      <p className="text-white">{shippingAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('checkout.billing')}</p>
                      <p className="text-white">{finalBillingAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('checkout.payment')}</p>
                      <p className="text-white">{methodLabel}</p>
                    </div>
                    {methodForOrder === 'card' && (
                      <div>
                        <p className="text-gray-500">{t('checkout.security')}</p>
                        <p className="text-white">{t('checkout.cvvProvided')}</p>
                      </div>
                    )}
                    {notes.trim() && (
                      <div>
                        <p className="text-gray-500">{t('checkout.notesLabel')}</p>
                        <p className="text-white">{notes}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReviewStep(false)}
                    className="text-xs px-3 py-2 rounded-lg border border-white/15 text-gray-300 hover:bg-white/10"
                  >
                    {t('checkout.editData')}
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {hasOutOfStockItems && <p className="text-red-400 text-sm">{t('errors.outOfStockCart')}</p>}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={isReviewStep ? placeOrder : goToReview}
                disabled={loading || hasOutOfStockItems}
                className="w-full bg-[#e8ff00] text-black font-black py-4 rounded-xl text-lg disabled:opacity-60 cursor-pointer"
              >
                {loading ? t('checkout.sendingOrder') : isReviewStep ? t('checkout.proceedToPayment') : t('checkout.goToOrderSummary')}
              </motion.button>

              {!isReviewStep && (
                <button
                  type="button"
                  onClick={saveAsPendingOrder}
                  disabled={savingDraft || loading || hasOutOfStockItems}
                  className="w-full mt-3 border border-white/20 text-white font-bold py-3 rounded-xl disabled:opacity-60 cursor-pointer hover:bg-white/10"
                >
                  {savingDraft ? t('checkout.savingDraft') : t('checkout.saveForLater')}
                </button>
              )}
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 h-fit">
              <h3 className="text-white font-black text-xl mb-4">{t('checkout.orderSummaryHeading')}</h3>
              <div className="space-y-3 mb-5">
                {items.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('cart.empty')}</p>
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
                            {isOutOfStock && <p className="text-red-400 text-xs mt-1">{t('product.outOfStock')}</p>}
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
                <span className="text-gray-400">{t('cart.total')}</span>
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
                        <p className="text-gray-500 text-xs">{t('product.specs.height')}</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.height}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">{t('product.specs.width')}</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.width}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">{t('product.specs.weight')}</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.weight}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">{t('product.specs.load')}</p>
                        <p className="text-white font-semibold">{selectedSummarySpecs.load}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 col-span-2">
                        <p className="text-gray-500 text-xs">{t('product.specs.material')}</p>
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
