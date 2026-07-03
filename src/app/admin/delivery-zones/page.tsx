'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { Pencil, Power, Trash2, Search } from 'lucide-react';
import { useAdminPaginatedApi, useAdminApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import type { DeliveryZone, DeliveryZoneFormData, Branch } from '@/lib/admin-types';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { ActiveToggleBadge } from '@/components/admin/status-badges';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useT } from '@/i18n';

// ─── Empty form state ──────────────────────────────────────────
const emptyForm: DeliveryZoneFormData = {
  name: '',
  branchId: '',
  description: '',
  minOrder: 0,
  deliveryFee: 0,
  estimatedMinutes: 30,
  isActive: true,
};

// ─── Zone form modal ───────────────────────────────────────────
function ZoneFormDialog({
  open,
  onOpenChange,
  editingZone,
  branches,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingZone: DeliveryZone | null;
  branches: Branch[];
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = editingZone !== null;
  const [form, setForm] = useState<DeliveryZoneFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const resetForm = (zone: DeliveryZone | null) => {
    if (zone) {
      setForm({
        name: zone.name,
        branchId: zone.branchId,
        description: zone.description ?? '',
        minOrder: zone.minOrder,
        deliveryFee: zone.deliveryFee,
        estimatedMinutes: zone.estimatedMinutes,
        isActive: zone.isActive,
      });
    } else {
      setForm(emptyForm);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm(editingZone);
    }
    onOpenChange(nextOpen);
  };

  const updateField = <K extends keyof DeliveryZoneFormData>(key: K, value: DeliveryZoneFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.branchId) return;

    setSaving(true);
    try {
      if (isEdit && editingZone) {
        await adminPut(`/api/admin/delivery-zones/${editingZone.id}`, form);
      } else {
        await adminPost('/api/admin/delivery-zones', form);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      // toast handled by adminPut/adminPost
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('admin.deliveryZones.edit') : t('admin.deliveryZones.create')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('admin.deliveryZones.edit') : t('admin.deliveryZones.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="zone-name">
              {t('admin.deliveryZones.name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="zone-name"
              placeholder={t('admin.deliveryZones.name')}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>

          {/* Branch select */}
          <div className="space-y-2">
            <Label htmlFor="zone-branch">
              {t('admin.deliveryZones.branch')} <span className="text-destructive">*</span>
            </Label>
            <Select value={form.branchId} onValueChange={(v) => updateField('branchId', v)}>
              <SelectTrigger id="zone-branch">
                <SelectValue placeholder={t('admin.deliveryZones.branch')} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fee + Min Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zone-fee">{t('admin.deliveryZones.fee')} (₴)</Label>
              <Input
                id="zone-fee"
                type="number"
                min={0}
                step={0.01}
                value={form.deliveryFee || ''}
                placeholder="0"
                onChange={(e) => updateField('deliveryFee', Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-min-order">{t('admin.deliveryZones.minOrder')} (₴)</Label>
              <Input
                id="zone-min-order"
                type="number"
                min={0}
                step={0.01}
                value={form.minOrder || ''}
                placeholder="0"
                onChange={(e) => updateField('minOrder', Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Estimated Minutes */}
          <div className="space-y-2">
            <Label htmlFor="zone-eta">{t('admin.deliveryZones.estimatedMinutes')}</Label>
            <Input
              id="zone-eta"
              type="number"
              min={0}
              value={form.estimatedMinutes || ''}
              placeholder="30"
              onChange={(e) => updateField('estimatedMinutes', Number(e.target.value) || 0)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="zone-desc">{t('admin.deliveryZones.description')}</Label>
            <Textarea
              id="zone-desc"
              rows={3}
              placeholder={t('admin.deliveryZones.description')}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          {/* isActive toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="zone-active"
              checked={form.isActive}
              onCheckedChange={(checked) => updateField('isActive', checked)}
            />
            <Label htmlFor="zone-active" className="cursor-pointer">
              {t('admin.deliveryZones.isActive')}
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim() || !form.branchId}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function DeliveryZonesPage() {
  const t = useT();
  const { data: zones, loading, refetch } = useAdminPaginatedApi<DeliveryZone>('/api/admin/delivery-zones');
  const { data: branches } = useAdminApi<Branch[]>('/api/admin/branches', []);

  // Branch filter
  const [branchFilter, setBranchFilter] = useState('');
  // Search
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = zones;
    if (branchFilter) {
      result = result.filter((z) => z.branchId === branchFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.branch?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [zones, branchFilter, search]);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    refetch();
  };

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/delivery-zones/${deleteTarget.id}`);
      refetch();
    } catch {
      // handled
    } finally {
      setDeleteTarget(null);
    }
  };

  // Toggle status
  const handleToggle = async (zone: DeliveryZone) => {
    try {
      await adminPut(`/api/admin/delivery-zones/${zone.id}`, { isActive: !zone.isActive });
      refetch();
    } catch {
      // handled
    }
  };

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('admin.deliveryZones.title')}
        description=""
        action={{ label: t('admin.deliveryZones.create'), onClick: handleOpenCreate }}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={branchFilter} onValueChange={(v) => setBranchFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('admin.deliveryZones.branch')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('common.all')}</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.deliveryZones.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('admin.deliveryZones.branch')}</TableHead>
                <TableHead>{t('admin.deliveryZones.fee')} (₴)</TableHead>
                <TableHead className="hidden sm:table-cell">{t('admin.deliveryZones.minOrder')} (₴)</TableHead>
                <TableHead className="hidden sm:table-cell">{t('admin.deliveryZones.estimatedMinutes')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('admin.deliveryZones.noZones')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-semibold">{zone.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {zone.branch?.name ?? '—'}
                    </TableCell>
                    <TableCell>{zone.deliveryFee}</TableCell>
                    <TableCell className="hidden sm:table-cell">{zone.minOrder}</TableCell>
                    <TableCell className="hidden sm:table-cell">{zone.estimatedMinutes}</TableCell>
                    <TableCell>
                      <ActiveToggleBadge active={zone.isActive} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(zone)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(zone)}
                          aria-label={zone.isActive ? t('admin.deliveryZones.isActive') : ''}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(zone)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create / Edit dialog */}
      <ZoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingZone={editingZone}
        branches={branches}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('admin.deliveryZones.deleteConfirm')}
        description={`«${deleteTarget?.name ?? ''}»`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </main>
  );
}