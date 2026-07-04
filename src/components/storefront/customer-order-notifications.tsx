'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useOrderWebSocket, type OrderWSPayload } from '@/hooks/use-order-ws'
import { useBrand } from '@/lib/store'
import { useT } from '@/i18n'

const STATUS_MESSAGE_MAP: Record<string, string> = {
  confirmed: 'notifications.orderConfirmed',
  cooking: 'notifications.orderCooking',
  ready: 'notifications.orderReady',
  delivering: 'notifications.orderDelivering',
  completed: 'notifications.orderCompleted',
  cancelled: 'notifications.orderCancelled',
}

export function CustomerOrderNotifications({ orderIds }: { orderIds: string[] }) {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const brandId = brand?.id || null

  const { onStatusChanged } = useOrderWebSocket(brandId, {
    orderIds,
  })

  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    const unsub = onStatusChanged((payload: OrderWSPayload) => {
      const status = payload.status || ''
      const messageKey = STATUS_MESSAGE_MAP[status]
      if (!messageKey) return

      const msg = tRef
        .current(messageKey)
        .replace('{number}', payload.orderNumber || '?')

      if (status === 'completed') {
        toast.success(msg, { duration: 6000 })
      } else if (status === 'cancelled') {
        toast.error(msg, { duration: 6000 })
      } else {
        toast.info(msg, { duration: 5000 })
      }
    })

    return unsub
  }, [onStatusChanged])

  // This component renders nothing — it's purely for side-effects
  return null
}