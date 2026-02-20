import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { CartDrawer } from '../ui/CartDrawer'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export function Layout() {
  const token = useAuthStore((state) => state.token)
  const syncFromBackend = useCartStore((state) => state.syncFromBackend)

  useEffect(() => {
    if (token) {
      void syncFromBackend()
    }
  }, [token, syncFromBackend])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <CartDrawer />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
