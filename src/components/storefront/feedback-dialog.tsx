'use client'

import { useState } from 'react'
import { useT } from '@/i18n'
import { API } from '@/lib/store'
import { useBrand } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2 } from 'lucide-react'

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
  orderId?: string
  branchId?: string
  primaryColor: string
}

export function FeedbackDialog({ open, onClose, orderId, branchId, primaryColor }: FeedbackDialogProps) {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const [type, setType] = useState<string>(orderId ? 'order_issue' : 'general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    try {
      await API.feedback.submit({
        type,
        subject: subject.trim() || undefined,
        message: message.trim(),
        contactInfo: contactInfo.trim() || undefined,
        orderId: orderId || undefined,
        branchId: branchId || undefined,
        brandId: brand?.id,
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setType('general')
        setSubject('')
        setMessage('')
        setContactInfo('')
        onClose()
      }, 2500)
    } catch {
      // error handled by global toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="text-sm text-center font-medium text-green-700">
              {t('feedback.feedbackSent')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>{t('feedback.type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_issue">{t('feedback.types.order_issue')}</SelectItem>
                  <SelectItem value="general">{t('feedback.types.general')}</SelectItem>
                  <SelectItem value="suggestion">{t('feedback.types.suggestion')}</SelectItem>
                  <SelectItem value="complaint">{t('feedback.types.complaint')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>{t('feedback.subject')}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('feedback.subjectPlaceholder')}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>{t('feedback.message')} *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedback.messagePlaceholder')}
                rows={4}
                required
              />
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              <Label>{t('feedback.contactInfo')}</Label>
              <Input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder={t('feedback.contactInfoPlaceholder')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!message.trim() || submitting}
                style={{ backgroundColor: primaryColor }}
                className="text-white"
              >
                {submitting ? t('common.loading') : t('feedback.submitFeedback')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}