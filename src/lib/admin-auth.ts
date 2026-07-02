'use client'
import { create } from 'zustand'

interface AdminAuthState {
  token: string | null
  userId: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  role: string | null
  brandId: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null

  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAdminAuth = create<AdminAuthState>((set, get) => ({
  token: null,
  userId: null,
  email: null,
  firstName: null,
  lastName: null,
  role: null,
  brandId: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      // 1. Check localStorage for existing admin token
      const stored = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null

      if (stored) {
        // 2. Validate the token by calling GET /api/me
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${stored}` },
        })
        const json = await res.json()

        if (json.success && json.data) {
          const user = json.data
          set({
            token: stored,
            userId: user.id ?? null,
            email: user.email ?? null,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            role: user.role ?? null,
            brandId: user.brandId ?? null,
            isAuthenticated: true,
            loading: false,
            error: null,
          })
          return
        }
        // Token is invalid — fall through to auto-login
      }

      // 4. Try auto-login as super_admin
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'super@sushichain.ua', password: '12345678' }),
      })
      const loginJson = await loginRes.json()

      if (loginJson.success && loginJson.data) {
        const { accessToken, user } = loginJson.data
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', accessToken)
        }
        set({
          token: accessToken,
          userId: user?.id ?? null,
          email: user?.email ?? null,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          role: user?.role ?? null,
          brandId: user?.brandId ?? null,
          isAuthenticated: true,
          loading: false,
          error: null,
        })
        return
      }

      // Auto-login failed — stay unauthenticated
      set({
        token: null,
        userId: null,
        email: null,
        firstName: null,
        lastName: null,
        role: null,
        brandId: null,
        isAuthenticated: false,
        loading: false,
        error: 'Автоматичний вхід не вдався',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Помилка ініціалізації'
      set({
        token: null,
        userId: null,
        email: null,
        firstName: null,
        lastName: null,
        role: null,
        brandId: null,
        isAuthenticated: false,
        loading: false,
        error: message,
      })
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()

      if (json.success && json.data) {
        const { accessToken, user } = json.data
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', accessToken)
        }
        set({
          token: accessToken,
          userId: user?.id ?? null,
          email: user?.email ?? null,
          firstName: user?.firstName ?? null,
          lastName: user?.lastName ?? null,
          role: user?.role ?? null,
          brandId: user?.brandId ?? null,
          isAuthenticated: true,
          loading: false,
          error: null,
        })
      } else {
        const msg = json.error?.message || 'Невірний email або пароль'
        set({ loading: false, error: msg })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Помилка входу'
      set({ loading: false, error: message })
    }
  },

  logout: () => {
    const token = get().token
    // Fire-and-forget: clear local state immediately
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token')
    }
    set({
      token: null,
      userId: null,
      email: null,
      firstName: null,
      lastName: null,
      role: null,
      brandId: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    })
    // Attempt server-side logout in the background
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {
        // Ignore errors — local state is already cleared
      })
    }
  },
}))