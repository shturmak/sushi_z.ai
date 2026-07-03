'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminPaginatedApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import type { Promotion, PromotionFormData, PromotionType, PromotionStatus } from '@/lib/admin-types';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { PromotionTypeBadge, PromotionStatusBadge } from '@/components/admin/status-badges';
import { TableSkeleton } from '@/components/admin/admin-skeletons';

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n';

// ── Helpers ──────────────────────────────────────────────

const EMPTY_FORM: PromotionFormData = {
  code: '',
  name: '',
  description: '',
  type: 'percentage',
  value: 0,
  minOrder: 0,
  maxUses: '',
  startDate: '',
  endDate: '',
  status: 'active',
};

function promotionToForm(p: Promotion): PromotionFormData {
  return {
    code: p.code ?? '',
    name: p.name,
    description: p.description ?? '',
    type: p.type,
    value: p.value,
    minOrder: p.minOrder,
    maxUses: p.maxUses !== null ? String(p.maxUses) : '',
    startDate: p.startDate ? format(parseISO(p.startDate), 'yyyy-MM-dd') : '',
    endDate: p.endDate ? format(parseISO(p.endDate), 'yyyy-MM-dd') : '',
    status: p.status,
  };
}

function formatValue(type: PromotionType, value: number): string {
  switch (type) {
    case 'percentage':
      return `${value}%`;
    case 'fixed':
      return `${value} ₴`;
    case 'free_delivery':
      return '—';
    case 'bonus':
      return `+${value}`;
    default:
      return String(value);
  }
}

function getValueLabel(type: PromotionType): string | null {
  switch (type) {
    case 'percentage':
      return '%';
    case 'fixed':
      return '₴';
    case 'bonus':
      return '—';
    case 'free_delivery':
      return null;
    default:
      return null;
  }
}

// ── Page Component ───────────────────────────────────────

export default function PromotionsPage() {
  const t = useT();

  const promotionTypes: { value: PromotionType; label: string }[] = [
    { value: 'percentage', label: t('admin.promotions.types.percentage') },
    { value: 'fixed', label: t('admin.promotions.types.fixed') },
    { value: 'free_delivery', label: t('admin.promotions.types.free_delivery') },
    { value: 'bonus', label: t('admin.promotions.types.bonus') },
  ];

  const promotionStatuses: { value: PromotionStatus; label: string }[] = [
    { value: 'active', label: t('admin.promotions.statuses.active') },
    { value: 'inactive', label: t('admin.promotions.statuses.inactive') },
    { value: 'expired', label: t('admin.promotions.statuses.expired') },
  ];

  const { data: promotions, loading, refetch } = useAdminPaginatedApi<Promotion>('/api/admin/promotions');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  // ── CRUD Handlers ──────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(promotion: Promotion) {
    setEditingId(promotion.id);
    setForm(promotionToForm(promotion));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error(`${t('admin.promotions.name')} *`);
      return;
    }
    if (form.type !== 'free_delivery' && form.value <= 0) {
      toast.error(`${t('admin.promotions.value')} > 0`);
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error(t('admin.promotions.period'));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await adminPut(`/api/admin/promotions/${editingId}`, form);
      } else {
        await adminPost('/api/admin/promotions', form);
      }
      setDialogOpen(false);
      refetch();
    } catch {
      // toast is shown inside adminPost/adminPut
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/promotions/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch {
      // toast shown inside adminDelete
    }
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title={t('admin.promotions.title')}
        description=""
        action={{ label: t('admin.promotions.create'), onClick: openCreate }}
      />

      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.promotions.name')}</TableHead>
                <TableHead>{t('admin.promotions.code')}</TableHead>
                <TableHead>{t('admin.promotions.type')}</TableHead>
                <TableHead>{t('admin.promotions.value')}</TableHead>
                <TableHead>{t('admin.promotions.period')}</TableHead>
                <TableHead>{t('admin.promotions.status')}</TableHead>
                <TableHead>{t('admin.promotions.usedCount')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.code || '—'}
                    </TableCell>
                    <TableCell>
                      <PromotionTypeBadge type={p.type} />
                    </TableCell>
                    <TableCell>{formatValue(p.type, p.value)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(parseISO(p.startDate), 'dd.MM.yy')} — {format(parseISO(p.endDate), 'dd.MM.yy')}
                    </TableCell>
                    <TableCell>
                      <PromotionStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>
                      {p.maxUses !== null ? `${p.usedCount} / ${p.maxUses}` : `${p.usedCount} / ∞`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{t('common.edit')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t('common.delete')}</span>
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

      {/* ── Create / Edit Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t('admin.promotions.edit') : t('admin.promotions.create')}</DialogTitle>
            <DialogDescription>
              {editingId ? t('admin.promotions.edit') : t('admin.promotions.create')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Code */}
            <div className="grid gap-2">
              <Label htmlFor="promo-code">{t('admin.promotions.code')}</Label>
              <Input
                id="promo-code"
                placeholder={t('admin.promotions.code')}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="promo-name">
                {t('admin.promotions.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promo-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="promo-desc">{t('admin.promotions.description')}</Label>
              <Textarea
                id="promo-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="promo-type">{t('admin.promotions.type')}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as PromotionType, value: f.type === 'free_delivery' ? 0 : f.value }))
                }
              >
                <SelectTrigger id="promo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promotionTypes.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value — hidden for free_delivery */}
            {form.type !== 'free_delivery' && (
              <div className="grid gap-2">
                <Label htmlFor="promo-value">
                  {getValueLabel(form.type)} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="promo-value"
                  type="number"
                  min={0}
                  value={form.value || ''}
                  onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                />
              </div>
            )}

            {/* Min Order */}
            <div className="grid gap-2">
              <Label htmlFor="promo-min-order">{t('admin.promotions.minOrder')}</Label>
              <Input
                id="promo-min-order"
                type="number"
                min={0}
                value={form.minOrder || ''}
                onChange={(e) => setForm((f) => ({ ...f, minOrder: Number(e.target.value) }))}
              />
            </div>

            {/* Max Uses */}
            <div className="grid gap-2">
              <Label htmlFor="promo-max-uses">{t('admin.promotions.maxUses')}</Label>
              <Input
                id="promo-max-uses"
                type="number"
                min={0}
                placeholder="∞"
                value={form.maxUses || ''}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              />
            </div>

            {/* Start Date */}
            <div className="grid gap-2">
              <Label htmlFor="promo-start">{t('admin.promotions.startDate')}</Label>
              <Input
                id="promo-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>

            {/* End Date */}
            <div className="grid gap-2">
              <Label htmlFor="promo-end">{t('admin.promotions.endDate')}</Label>
              <Input
                id="promo-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="promo-status">{t('admin.promotions.status')}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as PromotionStatus }))}
              >
                <SelectTrigger id="promo-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promotionStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : editingId ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('admin.promotions.deleteConfirm')}
        description={`«${deleteTarget?.name}»`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}