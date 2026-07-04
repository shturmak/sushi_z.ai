'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { Pencil, Power, Trash2, Search } from 'lucide-react';
import { useAdminPaginatedApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import type { Branch, BranchFormData } from '@/lib/admin-types';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useT } from '@/i18n';

// ─── Ukrainian slug transliteration ────────────────────────────
function slugify(text: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
    з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Extract city from address (last comma-separated segment) ──
function extractCity(address: string): string {
  const parts = address.split(',').map((p) => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : '—';
}

// ─── Empty form state ──────────────────────────────────────────
const emptyForm: BranchFormData = {
  name: '',
  slug: '',
  address: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  isOpen: true,
  workSchedule: '',
  description: '',
  autoConfirm: false,
  acceptingOrders: true,
  minOrderAmount: 0,
  prepTimeMinutes: 30,
};

// ─── Branch form modal ─────────────────────────────────────────
function BranchFormDialog({
  open,
  onOpenChange,
  editingBranch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBranch: Branch | null;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = editingBranch !== null;
  const [form, setForm] = useState<BranchFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [nameChangedManually, setNameChangedManually] = useState(false);

  // Reset form when dialog opens / editingBranch changes
  const resetForm = (branch: Branch | null) => {
    if (branch) {
      setForm({
        name: branch.name,
        slug: branch.slug,
        address: branch.address,
        phone: branch.phone ?? '',
        email: branch.email ?? '',
        latitude: branch.latitude?.toString() ?? '',
        longitude: branch.longitude?.toString() ?? '',
        isOpen: branch.isOpen,
        workSchedule: branch.workSchedule ?? '',
        description: branch.description ?? '',
        autoConfirm: branch.autoConfirm,
        acceptingOrders: branch.acceptingOrders,
        minOrderAmount: branch.minOrderAmount,
        prepTimeMinutes: branch.prepTimeMinutes,
      });
    } else {
      setForm(emptyForm);
    }
    setNameChangedManually(false);
  };

  // Sync when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm(editingBranch);
    }
    onOpenChange(nextOpen);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: nameChangedManually ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setNameChangedManually(true);
    setForm((prev) => ({ ...prev, slug }));
  };

  const updateField = <K extends keyof BranchFormData>(key: K, value: BranchFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      };

      if (isEdit && editingBranch) {
        await adminPut(`/api/admin/branches/${editingBranch.id}`, payload);
      } else {
        await adminPost('/api/admin/branches', payload);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      // toast error handled by adminPut/adminPost
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('admin.branches.edit') : t('admin.branches.create')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('admin.branches.edit') : t('admin.branches.create')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">
                {t('admin.branches.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branch-name"
                placeholder={t('admin.branches.name')}
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-slug">{t('admin.branches.slug')}</Label>
              <Input
                id="branch-slug"
                placeholder="sushi-master-center"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="branch-address">
              {t('admin.branches.address')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="branch-address"
              placeholder={t('admin.branches.address')}
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              required
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-phone">{t('admin.branches.phone')}</Label>
              <Input
                id="branch-phone"
                placeholder="+380 44 123 4567"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-email">{t('admin.branches.email')}</Label>
              <Input
                id="branch-email"
                type="email"
                placeholder="branch@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
          </div>

          {/* Latitude + Longitude */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-lat">Широта</Label>
              <Input
                id="branch-lat"
                type="number"
                step="any"
                placeholder="50.4501"
                value={form.latitude}
                onChange={(e) => updateField('latitude', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-lng">Довгота</Label>
              <Input
                id="branch-lng"
                type="number"
                step="any"
                placeholder="30.5234"
                value={form.longitude}
                onChange={(e) => updateField('longitude', e.target.value)}
              />
            </div>
          </div>

          {/* Work Schedule (JSON textarea) */}
          <div className="space-y-2">
            <Label htmlFor="branch-schedule">{t('admin.branches.schedule')} (JSON)</Label>
            <Textarea
              id="branch-schedule"
              rows={4}
              placeholder={'{"mon-fri": "10:00-22:00", "sat-sun": "11:00-23:00"}'}
              value={form.workSchedule}
              onChange={(e) => updateField('workSchedule', e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="branch-desc">{t('admin.branches.description')}</Label>
            <Textarea
              id="branch-desc"
              rows={3}
              placeholder={t('admin.branches.description')}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          {/* isOpen toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="branch-open"
              checked={form.isOpen}
              onCheckedChange={(checked) => updateField('isOpen', checked)}
            />
            <Label htmlFor="branch-open" className="cursor-pointer">
              {t('admin.branches.isOpen')}
            </Label>
          </div>

          <Separator className="my-2" />
          <p className="text-sm font-semibold text-muted-foreground">{t('admin.branches.orderSettings')}</p>

          {/* autoConfirm switch */}
          <div className="flex items-center gap-3">
            <Switch
              id="branch-auto-confirm"
              checked={form.autoConfirm}
              onCheckedChange={(checked) => updateField('autoConfirm', checked)}
            />
            <Label htmlFor="branch-auto-confirm" className="cursor-pointer">
              {t('admin.branches.autoConfirm')}
            </Label>
          </div>

          {/* acceptingOrders switch */}
          <div className="flex items-center gap-3">
            <Switch
              id="branch-accepting-orders"
              checked={form.acceptingOrders}
              onCheckedChange={(checked) => updateField('acceptingOrders', checked)}
            />
            <Label htmlFor="branch-accepting-orders" className="cursor-pointer">
              {t('admin.branches.acceptingOrders')}
            </Label>
          </div>

          {/* minOrderAmount + prepTimeMinutes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch-min-order">{t('admin.branches.minOrderAmount')}</Label>
              <Input
                id="branch-min-order"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.minOrderAmount}
                onChange={(e) => updateField('minOrderAmount', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-prep-time">{t('admin.branches.prepTimeMinutes')}</Label>
              <Input
                id="branch-prep-time"
                type="number"
                min="1"
                step="1"
                placeholder="30"
                value={form.prepTimeMinutes}
                onChange={(e) => updateField('prepTimeMinutes', Number(e.target.value))}
              />
            </div>
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
            <Button type="submit" disabled={saving || !form.name.trim() || !form.address.trim()}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function BranchesPage() {
  const t = useT();
  const { data: branches, loading, refetch } = useAdminPaginatedApi<Branch>('/api/admin/branches');

  // Search
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return branches;
    const q = search.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        extractCity(b.address).toLowerCase().includes(q),
    );
  }, [branches, search]);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    refetch();
  };

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/branches/${deleteTarget.id}`);
      refetch();
    } catch {
      // handled
    } finally {
      setDeleteTarget(null);
    }
  };

  // Toggle status
  const handleToggle = async (branch: Branch) => {
    try {
      await adminPut(`/api/admin/branches/${branch.id}`, { isOpen: !branch.isOpen });
      refetch();
    } catch {
      // handled
    }
  };

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('admin.branches.title')}
        description=""
        action={{ label: t('admin.branches.create'), onClick: handleOpenCreate }}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.branches.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('admin.branches.address')}</TableHead>
                <TableHead>{t('admin.branches.name')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-center">{t('admin.branches.orders')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-semibold">{branch.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-xs truncate">
                      {branch.address}
                    </TableCell>
                    <TableCell>{extractCity(branch.address)}</TableCell>
                    <TableCell>
                      <ActiveToggleBadge active={branch.isOpen} />
                    </TableCell>
                    <TableCell className="text-center">
                      {branch._count?.orders ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(branch)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(branch)}
                          aria-label={branch.isOpen ? t('admin.branches.isOpen') : ''}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(branch)}
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
      <BranchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingBranch={editingBranch}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('admin.branches.deleteConfirm')}
        description={`«${deleteTarget?.name ?? ''}»`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </main>
  );
}