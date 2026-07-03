'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { create } from 'zustand'
import { useOrderWebSocket, type OrderWSPayload } from '@/hooks/use-order-ws'
import { useT } from '@/i18n'

// ── Shared new-order-count store ──────────────────────────
// Module-level store so both the notification component and
// the sidebar badge read the same count.

interface NewOrderCountState {
  count: number
  increment: () => void
  reset: () => void
}

export const useNewOrderCountStore = create<NewOrderCountState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}))

/** Hook for the sidebar badge — reads count, provides reset */
export function useNewOrderCount() {
  const count = useNewOrderCountStore((s) => s.count)
  const reset = useNewOrderCountStore((s) => s.reset)
  return { count, reset }
}

// ── Notification sound via Web Audio API ──────────────────

function playNotificationBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // Silently fail — audio not available
  }
}

// ── Admin notification component ──────────────────────────
// Mount this once in the admin layout. It listens for new
// order events, shows a toast, plays a beep, and bumps the count.

export function AdminOrderNotifications({ brandId }: { brandId: string | null }) {
  const t = useT()
  const increment = useNewOrderCountStore((s) => s.increment)

  const { onOrderCreated, onStatusChanged } = useOrderWebSocket(brandId, {
    role: 'admin',
  })

  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])

  const incrementRef = useRef(increment)
  useEffect(() => { incrementRef.current = increment }, [increment])

  useEffect(() => {
    const unsubCreated = onOrderCreated((payload: OrderWSPayload) => {
      incrementRef.current()
      playNotificationBeep()

      const msg = tRef
        .current('notifications.newOrder')
        .replace('{number}', payload.orderNumber || '?')
      toast.info(msg, { duration: 5000 })
    })

    const unsubStatus = onStatusChanged((payload: OrderWSPayload) => {
      const msg = tRef
        .current('notifications.orderUpdated')
        .replace('{number}', payload.orderNumber || '?')
        .replace('{status}', payload.status || '?')
      toast.info(msg, { duration: 4000 })
    })

    return () => {
      unsubCreated()
      unsubStatus()
    }
  }, [onOrderCreated, onStatusChanged])

  // Reset count when admin navigates to orders page
  useEffect(() => {
    const handler = () => useNewOrderCountStore.getState().reset()
    window.addEventListener('admin-orders-viewed', handler)
    return () => window.removeEventListener('admin-orders-viewed', handler)
  }, [])

  // This component renders nothing — it's purely for side-effects
  return null
}