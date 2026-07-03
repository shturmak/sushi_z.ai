'use client'

import { useState } from 'react'
import { useAuth, API } from '@/lib/store'
import { useT } from '@/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const t = useT()
  const login = useAuth((s) => s.login)

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Register state
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const { data, error } = await API.auth.login(loginEmail, loginPassword)
    setLoginLoading(false)
    if (error) {
      setLoginError(error)
      return
    }
    if (data) {
      login({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      onOpenChange(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegLoading(true)
    setRegError('')
    const { data: regData, error: regErr } = await API.auth.register({
      phone: regPhone || undefined,
      email: regEmail || undefined,
      password: regPassword,
      firstName: regFirstName,
      lastName: regLastName,
    })
    if (regErr) {
      setRegError(regErr)
      setRegLoading(false)
      return
    }
    if (regData) {
      login({
        user: regData.user,
        accessToken: regData.accessToken,
        refreshToken: regData.refreshToken,
      })
      onOpenChange(false)
    }
    setRegLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('auth.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              {t('auth.loginTab')}
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              {t('auth.registerTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="login-email">
                  {t('auth.email')}
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="email@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="login-password">
                  {t('auth.password')}
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading && <Loader2 className="animate-spin" />}
                {t('auth.loginTab')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reg-phone">
                  {t('auth.phone')}
                </label>
                <Input
                  id="reg-phone"
                  type="tel"
                  placeholder={t('auth.phonePlaceholder')}
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reg-email">
                  {t('auth.email')}
                </label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="reg-first">
                    {t('auth.firstName')}
                  </label>
                  <Input
                    id="reg-first"
                    placeholder={t('auth.firstNamePlaceholder')}
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="reg-last">
                    {t('auth.lastName')}
                  </label>
                  <Input
                    id="reg-last"
                    placeholder={t('auth.lastNamePlaceholder')}
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reg-password">
                  {t('auth.password')}
                </label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {regError && (
                <p className="text-sm text-destructive">{regError}</p>
              )}
              <Button type="submit" className="w-full" disabled={regLoading}>
                {regLoading && <Loader2 className="animate-spin" />}
                {t('auth.registerButton')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}