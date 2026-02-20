export interface ProductSpecs {
  height: string
  width: string
  weight: string
  load: string
  material: string
}

export interface Product {
  id: number
  name: string
  slug: string
  description: string
  price: number
  images: string[]
  category: Category
  stock: number
  featured: boolean
  createdAt: string
  specs?: ProductSpecs
  tag?: string
}

export interface Category {
  id: number
  name: string
  slug: string
}

export interface SavedPaymentMethod {
  id: string
  method: 'card' | 'paypal' | 'bank'
  maskedLabel: string
  isDefault: boolean
  paypalEmail?: string
  cardBrand?: string
  cardLast4?: string
  cardExpiry?: string
  bankIbanLast4?: string
}

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: 'user' | 'admin'
  phone?: string
  address?: string
  billingAddress?: string
  paymentMethod?: 'card' | 'paypal' | 'bank'
  paymentCardHolder?: string
  paymentCardBrand?: string
  paymentCardLast4?: string
  paymentCardExpiry?: string
  paymentMethods?: SavedPaymentMethod[]
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: number
  items: CartItem[]
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}
