'use client'
import { useEffect } from 'react'
import { useAdminAuth } from '@/lib/admin-auth'
import { Loader2 } from 'lucide-react'

export function AdminAuthInit() {
  const { init, loading, error } = useAdminAuth()

  useEffect(() => { init() }, [init])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={init} className="text-sm text-primary underline">Спробувати знову</button>
        </div>
      </div>
    )
  }

  return null
}