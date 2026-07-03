import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = Number(process.env.PORT || 3004)

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ── Types ──────────────────────────────────────────────────

interface OrderPayload {
  orderId: string
  orderNumber: string
  brandId: string
  status?: string
  [key: string]: unknown
}

// ── Connection handling ────────────────────────────────────

io.on('connection', (socket) => {
  const { brandId, role, orderId } = socket.handshake.query as Record<string, string | undefined>

  console.log(`[orders-ws] Client connected: ${socket.id} (brandId=${brandId}, role=${role}, orderId=${orderId})`)

  // Admin: join the brand-wide room to hear ALL events for that brand
  if (role === 'admin' && brandId) {
    socket.join(`brand:${brandId}`)
    console.log(`[orders-ws] ${socket.id} joined brand:${brandId} (admin)`)
  }

  // Customer: join specific order room(s)
  if (orderId) {
    const orderIds = orderId.split(',')
    for (const id of orderIds) {
      socket.join(`order:${id}`)
    }
    console.log(`[orders-ws] ${socket.id} joined order rooms: ${orderIds.map((id) => `order:${id}`).join(', ')}`)
  }

  // ── order:created — broadcast to brand room ────────────
  socket.on('order:created', (payload: OrderPayload) => {
    const room = `brand:${payload.brandId}`
    console.log(`[orders-ws] order:created → ${room} (#${payload.orderNumber})`)
    io.to(room).emit('order:created', payload)
    io.to(room).emit('order:new', payload) // alias
  })

  // ── order:status_changed — broadcast to brand + order room
  socket.on('order:status_changed', (payload: OrderPayload) => {
    const brandRoom = `brand:${payload.brandId}`
    const orderRoom = `order:${payload.orderId}`
    console.log(
      `[orders-ws] order:status_changed → ${brandRoom} + ${orderRoom} (#${payload.orderNumber} → ${payload.status})`,
    )
    io.to(brandRoom).emit('order:status_changed', payload)
    io.to(orderRoom).emit('order:status_changed', payload)
  })

  // ── order:new — alias for order:created ─────────────────
  socket.on('order:new', (payload: OrderPayload) => {
    const room = `brand:${payload.brandId}`
    console.log(`[orders-ws] order:new → ${room} (#${payload.orderNumber})`)
    io.to(room).emit('order:new', payload)
    io.to(room).emit('order:created', payload) // alias
  })

  // ── Disconnect ──────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[orders-ws] Client disconnected: ${socket.id} (${reason})`)
  })
})

// ── Start server ────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[orders-ws] Orders WebSocket server running on port ${PORT}`)
})

// ── Graceful shutdown ───────────────────────────────────────

function shutdown(signal: string) {
  console.log(`[orders-ws] Received ${signal}, shutting down...`)
  io.close()
  httpServer.close(() => {
    console.log('[orders-ws] Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))