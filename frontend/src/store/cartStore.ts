import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '../types'
import api from '../lib/axios'
import { useAuthStore } from './authStore'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  closeCart: () => void
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  syncFromBackend: () => Promise<void>
  toggleCart: () => void
  total: () => number
  count: () => number
}

const isAuthenticated = () => !!useAuthStore.getState().token

const normalizeProductPrice = (product: Product): Product => ({
  ...product,
  price: Number(product.price),
})

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      closeCart: () => set({ isOpen: false }),

      syncFromBackend: async () => {
        if (!isAuthenticated()) return
        try {
          const res = await api.get('/cart')
          const serverItems = (res.data?.items ?? []).map((item: { product: Product; quantity: number }) => ({
            product: normalizeProductPrice(item.product),
            quantity: item.quantity,
          }))
          set({ items: serverItems })
        } catch {
          // keep local cart fallback
        }
      },

      addItem: (product, quantity = 1) => {
        const normalizedProduct = normalizeProductPrice(product)
        set((state) => {
          const existing = state.items.find((i) => i.product.id === normalizedProduct.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === normalizedProduct.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
              isOpen: true,
            }
          }
          return { items: [...state.items, { product: normalizedProduct, quantity }], isOpen: true }
        })

        if (isAuthenticated()) {
          void api.post('/cart/items', { productId: normalizedProduct.id, quantity }).then(() => get().syncFromBackend()).catch(() => undefined)
        }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }))

        if (isAuthenticated()) {
          void api.delete(`/cart/items/${productId}`).then(() => get().syncFromBackend()).catch(() => undefined)
        }
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.product.id !== productId)
              : state.items.map((i) =>
                  i.product.id === productId ? { ...i, quantity } : i
                ),
        }))

        if (isAuthenticated()) {
          if (quantity <= 0) {
            void api.delete(`/cart/items/${productId}`).then(() => get().syncFromBackend()).catch(() => undefined)
          } else {
            void api.put(`/cart/items/${productId}`, { quantity }).then(() => get().syncFromBackend()).catch(() => undefined)
          }
        }
      },

      clearCart: () => {
        set({ items: [] })
        if (isAuthenticated()) {
          void api.delete('/cart').catch(() => undefined)
        }
      },
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      total: () => get().items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'static-cart' }
  )
)
