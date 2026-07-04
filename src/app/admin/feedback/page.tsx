'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Eye, Send, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

import { useAdminPaginatedApi } from '@/lib/admin-api';
import { useAdminAuth } from '@/lib/admin-auth';
import { useBrandStore } from '@/lib/brand-store';
import { PageHeader } from '@/components/admin/page-header';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/i18n';
import type { Feedback, FeedbackStatus } from '@/lib/admin-types';

// ── Status badge colors ──────────────────────────────────

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const t = useT();
  const map: Record<FeedbackStatus, { className: string; label: string }> = {
    new: {
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      label: t('admin.feedback.status.new'),
    },
    in_progress: {
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      label: t('admin.feedback.status.inProgress'),
    },
    resolved: {
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      label: t('admin.feedback.status.resolved'),
    },
    closed: {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      label: t('admin.feedback.status.closed'),
    },
  };
  const { className, label } = map[status] ?? map.new;
  return <Badge variant="secondary" className={className}>{label}</Badge>;
}

// ── Type badge ──────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const t = useT();
  const map: Record<string, { className: string; label: string }> = {
    order_issue: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      label: t('admin.feedback.type.orderIssue'),
    },
    general: {
      className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
      label: t('admin.feedback.type.general'),
    },
    suggestion: {
      className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
      label: t('admin.feedback.type.suggestion'),
    },
    complaint: {
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      label: t('admin.feedback.type.complaint'),
    },
  };
  const { className, label } = map[type] ?? map.general;
  return <Badge variant="secondary" className={className}>{label}</Badge>;
}

// ── Component ──────────────────────────────────────────

export default function FeedbackPage() {
  const t = useT();
  const brandId = useBrandStore((s) => s.currentBrandId);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Build query string with filters
  const queryString = new URLSearchParams();
  if (brandId) queryString.set('brandId', brandId);
  if (statusFilter !== 'all') queryString.set('status', statusFilter);
  if (typeFilter !== 'all') queryString.set('type', typeFilter);

  const qs = queryString.toString();
  const { data: feedbacks, loading, refetch } = useAdminPaginatedApi<Feedback>(
    `/api/admin/feedback${qs ? `?${qs}` : ''}`,
  );

  // Refetch when filters change
  useEffect(() => {
    // useAdminPaginatedApi auto-refetches when path changes
  }, [statusFilter, typeFilter]);

  // ── Admin patch helper (no adminPatch in admin-api, so use raw fetch) ──

  const adminPatch = useCallback(async (id: string, body: Record<string, unknown>) => {
    const token = useAdminAuth.getState().token;
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || `Request failed (${res.status})`);
    }
    return json.data;
  }, []);

  // ── Handlers ──

  const handleSendReply = async () => {
    if (!selectedFeedback || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await adminPatch(selectedFeedback.id, { adminReply: replyText.trim() });
      toast.success(t('admin.feedback.replySent'));
      setReplyText('');
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    try {
      await adminPatch(id, { status });
      toast.success(t('admin.feedback.statusUpdated'));
      await refetch();
      // Update the selected dialog if it's the same item
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, status });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    }
  };

  const openDetail = (fb: Feedback) => {
    setSelectedFeedback(fb);
    setReplyText(fb.adminReply || '');
  };

  const truncate = (str: string, max = 60) =>
    str.length > max ? str.slice(0, max) + '…' : str;

  // ── Render ──

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.feedback.title')} description="" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.feedback.filter.allStatus')}</SelectItem>
            <SelectItem value="new">{t('admin.feedback.status.new')}</SelectItem>
            <SelectItem value="in_progress">{t('admin.feedback.status.inProgress')}</SelectItem>
            <SelectItem value="resolved">{t('admin.feedback.status.resolved')}</SelectItem>
            <SelectItem value="closed">{t('admin.feedback.status.closed')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.feedback.filter.allTypes')}</SelectItem>
            <SelectItem value="order_issue">{t('admin.feedback.type.orderIssue')}</SelectItem>
            <SelectItem value="general">{t('admin.feedback.type.general')}</SelectItem>
            <SelectItem value="suggestion">{t('admin.feedback.type.suggestion')}</SelectItem>
            <SelectItem value="complaint">{t('admin.feedback.type.complaint')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.feedback.date')}</TableHead>
                <TableHead>{t('admin.feedback.typeLabel')}</TableHead>
                <TableHead>{t('admin.feedback.from')}</TableHead>
                <TableHead className="max-w-[240px]">{t('admin.feedback.subjectMessage')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t('admin.feedback.noFeedback')}
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks.map((fb) => (
                  <TableRow
                    key={fb.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(fb)}
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(fb.createdAt), 'dd.MM.yy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={fb.type} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-sm">
                      {fb.user
                        ? `${fb.user.firstName} ${fb.user.lastName}`
                        : t('admin.feedback.guest')}
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="text-sm font-medium truncate">{fb.subject || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">{truncate(fb.message)}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={fb.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(fb);
                        }}
                        title={t('common.view')}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.feedback.detailTitle')}</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('admin.feedback.date')}:</span>{' '}
                  <span className="font-medium">{format(new Date(selectedFeedback.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('admin.feedback.typeLabel')}:</span>{' '}
                  <TypeBadge type={selectedFeedback.type} />
                </div>
                <div>
                  <span className="text-muted-foreground">{t('admin.feedback.from')}:</span>{' '}
                  <span className="font-medium">
                    {selectedFeedback.user
                      ? `${selectedFeedback.user.firstName} ${selectedFeedback.user.lastName}`
                      : t('admin.feedback.guest')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('common.status')}:</span>{' '}
                  <StatusBadge status={selectedFeedback.status} />
                </div>
              </div>

              {/* Contact info */}
              {selectedFeedback.contactInfo && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('admin.feedback.contactInfo')}:</span>{' '}
                  <span className="font-medium">{selectedFeedback.contactInfo}</span>
                </div>
              )}

              {/* Linked order */}
              {selectedFeedback.order && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('admin.feedback.linkedOrder')}:</span>{' '}
                  <span className="font-medium">{selectedFeedback.order.orderNumber}</span>
                </div>
              )}

              {/* Linked branch */}
              {selectedFeedback.branch && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('admin.feedback.branch')}:</span>{' '}
                  <span className="font-medium">{selectedFeedback.branch.name}</span>
                </div>
              )}

              {/* Subject */}
              {selectedFeedback.subject && (
                <div>
                  <div className="text-sm font-medium mb-1">{selectedFeedback.subject}</div>
                </div>
              )}

              {/* Message */}
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {selectedFeedback.message}
              </div>

              {/* Admin reply */}
              {selectedFeedback.adminReply && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {t('admin.feedback.adminReply')}
                  </div>
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-sm whitespace-pre-wrap">
                    {selectedFeedback.adminReply}
                  </div>
                </div>
              )}

              {/* Reply textarea */}
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('admin.feedback.replyPlaceholder')}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={submitting || !replyText.trim()}
                  >
                    <Send className="size-3.5 mr-1.5" />
                    {t('admin.feedback.sendReply')}
                  </Button>
                </div>
              </div>

              {/* Status actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {(selectedFeedback.status === 'new' || selectedFeedback.status === 'in_progress') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedFeedback.id, 'resolved')}
                  >
                    <CheckCircle2 className="size-3.5 mr-1.5 text-green-600" />
                    {t('admin.feedback.markResolved')}
                  </Button>
                )}
                {(selectedFeedback.status === 'new' || selectedFeedback.status === 'in_progress') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedFeedback.id, 'closed')}
                  >
                    <XCircle className="size-3.5 mr-1.5 text-gray-500" />
                    {t('admin.feedback.close')}
                  </Button>
                )}
                {(selectedFeedback.status === 'resolved' || selectedFeedback.status === 'closed') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedFeedback.id, 'in_progress')}
                  >
                    <RotateCcw className="size-3.5 mr-1.5 text-amber-600" />
                    {t('admin.feedback.reopen')}
                  </Button>
                )}
                {selectedFeedback.status === 'new' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(selectedFeedback.id, 'in_progress')}
                  >
                    {t('admin.feedback.markInProgress')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}