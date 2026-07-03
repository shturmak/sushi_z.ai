'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Check, X, MessageSquare, Trash2 } from 'lucide-react';

import { useAdminPaginatedApi, adminPut, adminDelete } from '@/lib/admin-api';
import { useBrandStore } from '@/lib/brand-store';
import { PageHeader } from '@/components/admin/page-header';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { StarRatingText } from '@/components/ui/star-rating';
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

// ── Types ──────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isAdminReply: string | null;
  isApproved: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
  product: { name: string } | null;
  order: { orderNumber: string };
}

interface ReviewsApiResponse {
  data: Review[];
  pagination: { page: number; limit: number; total: number; pages: number; hasNext: boolean; hasPrev: boolean };
  pendingCount: number;
}

// ── Pending count store (module-level) ─────────────

let pendingCountState = 0;
let pendingCountListeners: Array<() => void> = [];

function setPendingCount(count: number) {
  pendingCountState = count;
  pendingCountListeners.forEach((fn) => fn());
}

export function usePendingReviewCount() {
  const [count, setCount] = useState(pendingCountState);
  useEffect(() => {
    pendingCountListeners.push(setCount);
    return () => {
      pendingCountListeners = pendingCountListeners.filter((fn) => fn !== setCount);
    };
  }, []);
  return count;
}

// ── Component ──────────────────────────────────────

export default function ReviewsPage() {
  const t = useT();
  const brandId = useBrandStore((s) => s.currentBrandId);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: reviews, loading, refetch } = useAdminPaginatedApi<Review>(
    '/api/admin/reviews',
  );

  // Update pending count store from API response
  const fetchWithCount = useCallback(async () => {
    const token = localStorage.getItem('sc_admin_token');
    if (!token || !brandId) return;
    try {
      const res = await fetch(`/api/admin/reviews?status=all&brandId=${brandId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success && json.data?.pendingCount !== undefined) {
        setPendingCount(json.data.pendingCount);
      }
    } catch {
      // silent
    }
  }, [brandId]);

  useEffect(() => {
    fetchWithCount();
  }, [fetchWithCount]);

  // Client-side filtering
  const filteredReviews = reviews.filter((r) => {
    if (statusFilter === 'pending' && r.isApproved) return false;
    if (statusFilter === 'approved' && !r.isApproved) return false;
    return true;
  });

  // ── Handlers ──

  const handleApprove = async (id: string) => {
    await adminPut(`/api/admin/reviews/${id}`, { isApproved: true });
    await refetch();
    fetchWithCount();
  };

  const handleReject = async (id: string) => {
    await adminPut(`/api/admin/reviews/${id}`, { isApproved: false });
    await refetch();
    fetchWithCount();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await adminDelete(`/api/admin/reviews/${id}`);
      await refetch();
      fetchWithCount();
    } catch {
      // error handled by adminDelete
    } finally {
      setDeletingId(null);
    }
  };

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await adminPut(`/api/admin/reviews/${replyTarget.id}`, {
        isApproved: true,
        isAdminReply: replyText.trim(),
      });
      setReplyTarget(null);
      setReplyText('');
      await refetch();
      fetchWithCount();
    } catch {
      // error handled
    } finally {
      setSubmittingReply(false);
    }
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.reviews.title')} description="" />

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.reviews.all')}</SelectItem>
            <SelectItem value="pending">{t('admin.reviews.pending')}</SelectItem>
            <SelectItem value="approved">{t('admin.reviews.approved')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.ordersAdmin.customer')}</TableHead>
                <TableHead>{t('admin.products.name')}</TableHead>
                <TableHead>{t('reviews.rating')}</TableHead>
                <TableHead className="max-w-[200px]">{t('reviews.comment')}</TableHead>
                <TableHead>{t('admin.ordersAdmin.date')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t('admin.reviews.noReviews')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {review.user.firstName} {review.user.lastName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {review.product?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <StarRatingText rating={review.rating} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {review.comment || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(review.createdAt), 'dd.MM.yy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {review.isApproved ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          {t('admin.reviews.approved')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                          {t('admin.reviews.pending')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!review.isApproved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(review.id)}
                            title={t('admin.reviews.approve')}
                          >
                            <Check className="size-4" />
                          </Button>
                        )}
                        {review.isApproved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(review.id)}
                            title={t('admin.reviews.reject')}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setReplyTarget(review);
                            setReplyText(review.isAdminReply || '');
                          }}
                          title={t('admin.reviews.reply')}
                        >
                          <MessageSquare className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(review.id)}
                          disabled={deletingId === review.id}
                          title={t('common.delete')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={!!replyTarget} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.reviews.reply')}</DialogTitle>
          </DialogHeader>
          {replyTarget && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {replyTarget.user.firstName} {replyTarget.user.lastName} —{' '}
                {replyTarget.product?.name || '—'}
              </div>
              <div className="rounded-md bg-muted p-3 text-sm">
                {replyTarget.comment || '(no comment)'}
              </div>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('reviews.commentPlaceholder')}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReply}
              disabled={submittingReply || !replyText.trim()}
            >
              {t('reviews.submitReview')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}