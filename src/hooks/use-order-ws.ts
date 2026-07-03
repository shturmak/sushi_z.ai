'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'

export interface OrderWSPayload {
  orderId: string
  orderNumber: string
  brandId: string
  status?: string
  [key: string]: unknown
}

export interface UseOrderWebSocketOptions {
  /** 'admin' joins brand-wide room, undefined = customer (join order rooms only) */
  role?: 'admin'
  /** For customers: comma-separated order IDs to track */
  orderIds?: string[]
  /** Extra event handlers */
  onConnect?: () => void
  onDisconnect?: () => void
}

export interface UseOrderWebSocketReturn {
  isConnected: boolean
  onOrderCreated: (handler: (payload: OrderWSPayload) => void) => () => void
  onStatusChanged: (handler: (payload: OrderWSPayload) => void) => () => void
}

export function useOrderWebSocket(
  brandId: string | null | undefined,
  options: UseOrderWebSocketOptions = {},
): UseOrderWebSocketReturn {
  const { role, orderIds, onConnect, onDisconnect } = options

  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Keep handlers in refs so we can update them without reconnecting
  const createdHandlers = useRef<Set<(payload: OrderWSPayload) => void>>(new Set())
  const statusHandlers = useRef<Set<(payload: OrderWSPayload) => void>>(new Set())
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  useEffect(() => { onConnectRef.current = onConnect }, [onConnect])
  useEffect(() => { onDisconnectRef.current = onDisconnect }, [onDisconnect])

  useEffect(() => {
    if (!brandId) return

    // Build query params
    const params = new URLSearchParams()
    params.set('brandId', brandId)
    if (role === 'admin') {
      params.set('role', 'admin')
    }
    if (orderIds && orderIds.length > 0) {
      params.set('orderId', orderIds.join(','))
    }

    const socket = io(`/?XTransformPort=3004&${params.toString()}`, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      onConnectRef.current?.()
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      onDisconnectRef.current?.()
    })

    // Listen for server-emitted events
    socket.on('order:created', (payload: OrderWSPayload) => {
      createdHandlers.current.forEach((fn) => fn(payload))
    })

    socket.on('order:new', (payload: OrderWSPayload) => {
      // alias — fire the same handlers
      createdHandlers.current.forEach((fn) => fn(payload))
    })

    socket.on('order:status_changed', (payload: OrderWSPayload) => {
      statusHandlers.current.forEach((fn) => fn(payload))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [brandId])

  const onOrderCreated = useCallback((handler: (payload: OrderWSPayload) => void) => {
    createdHandlers.current.add(handler)
    return () => {
      createdHandlers.current.delete(handler)
    }
  }, [])

  const onStatusChanged = useCallback((handler: (payload: OrderWSPayload) => void) => {
    statusHandlers.current.add(handler)
    return () => {
      statusHandlers.current.delete(handler)
    }
  }, [])

  return { isConnected, onOrderCreated, onStatusChanged }
}