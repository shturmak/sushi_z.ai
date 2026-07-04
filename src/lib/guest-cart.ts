import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Guest Cart — localStorage-based cart for unauthenticated users ──

export interface GuestCartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface GuestCartState {
  items: GuestCartItem[]
  addItem: (product: { id: string; name: string; price: number }) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
}

export const useGuestCart = create<GuestCartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const items = get().items
        const existing = items.find((i) => i.productId === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          })
        } else {
          set({
            items: [
              ...items,
              { productId: product.id, name: product.name, price: product.price, quantity: 1 },
            ],
          })
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) })
      },

      updateQuantity: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity: qty } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: 'sc_guest_cart' }
  )
)

// Derived helpers (used outside React — call from within components)

export function getGuestCartTotalCount(): number {
  return useGuestCart.getState().items.reduce((sum, i) => sum + i.quantity, 0)
}

export function getGuestCartSubtotal(): number {
  return useGuestCart.getState().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
}