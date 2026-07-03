'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { Pencil, Power, Trash2, Search, Palette } from 'lucide-react';
import { useAdminApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
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
import { useT } from '@/i18n';
import { useAdminAuth } from '@/lib/admin-auth';

// ─── Types ──────────────────────────────────────────────────
interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  description: string | null;
  slogan: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { branches: number; products: number; orders: number };
}

interface BrandFormData {
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
  slogan: string;
  logoUrl: string;
  isActive: boolean;
}

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

// ─── Inline PATCH helper (toggle uses PATCH, not PUT) ──────
async function adminPatch<TRes = unknown>(path: string, body?: unknown): Promise<TRes> {
  const token = useAdminAuth.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
    method: 'PATCH',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }

  return (json as { success: boolean; data: TRes }).data;
}

// ─── Empty form state ──────────────────────────────────────────
const emptyForm: BrandFormData = {
  name: '',
  slug: '',
  primaryColor: '#000000',
  secondaryColor: '',
  accentColor: '',
  description: '',
  slogan: '',
  logoUrl: '',
  isActive: true,
};

// ─── Color swatch component ────────────────────────────────────
function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-5 w-5 rounded-full border border-border shrink-0"
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

// ─── Brand form dialog ─────────────────────────────────────────
function BrandFormDialog({
  open,
  onOpenChange,
  editingBrand,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBrand: Brand | null;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = editingBrand !== null;
  const [form, setForm] = useState<BrandFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  // Reset form when dialog opens / editingBrand changes
  const resetForm = (brand: Brand | null) => {
    if (brand) {
      setForm({
        name: brand.name,
        slug: brand.slug,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor ?? '',
        accentColor: brand.accentColor ?? '',
        description: brand.description ?? '',
        slogan: brand.slogan ?? '',
        logoUrl: brand.logoUrl ?? '',
        isActive: brand.isActive,
      });
    } else {
      setForm(emptyForm);
    }
    setSlugEdited(false);
  };

  // Sync when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm(editingBrand);
    }
    onOpenChange(nextOpen);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugEdited ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugEdited(true);
    setForm((prev) => ({ ...prev, slug }));
  };

  const updateField = <K extends keyof BrandFormData>(key: K, value: BrandFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.primaryColor.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor || null,
        accentColor: form.accentColor || null,
        description: form.description || null,
        slogan: form.slogan || null,
        logoUrl: form.logoUrl || null,
        isActive: form.isActive,
      };

      if (isEdit && editingBrand) {
        await adminPut(`/api/admin/brands/${editingBrand.id}`, payload);
      } else {
        await adminPost('/api/admin/brands', payload);
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
          <DialogTitle>
            {isEdit ? t('admin.brands.edit') : t('admin.brands.create')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('admin.brands.editDesc') : t('admin.brands.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">
                {t('admin.brands.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand-name"
                placeholder={t('admin.brands.namePlaceholder')}
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-slug">{t('admin.brands.slug')}</Label>
              <Input
                id="brand-slug"
                placeholder="my-brand"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
            </div>
          </div>

          {/* Colors row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-primary-color" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('admin.brands.primaryColor')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="brand-primary-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => updateField('primaryColor', e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => updateField('primaryColor', e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-secondary-color" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('admin.brands.secondaryColor')}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="brand-secondary-color"
                  type="color"
                  value={form.secondaryColor || '#000000'}
                  onChange={(e) => updateField('secondaryColor', e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input"
                />
                <Input
                  value={form.secondaryColor}
                  onChange={(e) => updateField('secondaryColor', e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-accent-color" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('admin.brands.accentColor')}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="brand-accent-color"
                  type="color"
                  value={form.accentColor || '#000000'}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input"
                />
                <Input
                  value={form.accentColor}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          {/* Slogan + Logo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-slogan">{t('admin.brands.slogan')}</Label>
              <Input
                id="brand-slogan"
                placeholder={t('admin.brands.sloganPlaceholder')}
                value={form.slogan}
                onChange={(e) => updateField('slogan', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-logo">{t('admin.brands.logoUrl')}</Label>
              <Input
                id="brand-logo"
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => updateField('logoUrl', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="brand-desc">{t('admin.brands.description')}</Label>
            <Textarea
              id="brand-desc"
              rows={3}
              placeholder={t('admin.brands.descriptionPlaceholder')}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          {/* isActive toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="brand-active"
              checked={form.isActive}
              onCheckedChange={(checked) => updateField('isActive', checked)}
            />
            <Label htmlFor="brand-active" className="cursor-pointer">
              {t('admin.brands.isActive')}
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
            <Button
              type="submit"
              disabled={saving || !form.name.trim() || !form.primaryColor.trim()}
            >
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function BrandsPage() {
  const t = useT();
  const { data: brands, loading, refetch } = useAdminApi<Brand[]>('/api/admin/brands', []);

  // Search
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const handleOpenCreate = () => {
    setEditingBrand(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    refetch();
  };

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const getDeleteDescription = (brand: Brand): string => {
    const warnings: string[] = [];
    if ((brand._count?.branches ?? 0) > 0) {
      warnings.push(`${brand._count.branches} ${t('admin.brands.branchesCount')}`);
    }
    if ((brand._count?.products ?? 0) > 0) {
      warnings.push(`${brand._count.products} ${t('admin.brands.productsCount')}`);
    }
    if (warnings.length > 0) {
      return `«${brand.name}» — ${warnings.join(', ')}`;
    }
    return `«${brand.name}»`;
  };

  const canDelete = (brand: Brand): boolean => {
    return (brand._count?.branches ?? 0) === 0 && (brand._count?.products ?? 0) === 0;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/brands/${deleteTarget.id}`);
      refetch();
    } catch {
      // handled
    } finally {
      setDeleteTarget(null);
    }
  };

  // Toggle status (uses PATCH)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (brand: Brand) => {
    setTogglingId(brand.id);
    try {
      await adminPatch(`/api/admin/brands/${brand.id}`);
      refetch();
    } catch {
      // handled
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('admin.brands.title')}
        description=""
        action={{ label: t('admin.brands.create'), onClick: handleOpenCreate }}
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
        <TableSkeleton rows={5} cols={7} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.brands.name')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('admin.brands.slug')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('admin.brands.color')}</TableHead>
                <TableHead className="text-center">{t('admin.brands.branches')}</TableHead>
                <TableHead className="text-center hidden sm:table-cell">{t('admin.brands.products')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((brand) => (
                  <TableRow key={brand.id}>
                    {/* Name + Color Swatch */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ColorSwatch color={brand.primaryColor} />
                        <span className="font-semibold">{brand.name}</span>
                      </div>
                    </TableCell>

                    {/* Slug */}
                    <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-sm">
                      {brand.slug}
                    </TableCell>

                    {/* Color */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <ColorSwatch color={brand.primaryColor} />
                        {brand.secondaryColor && <ColorSwatch color={brand.secondaryColor} />}
                        {brand.accentColor && <ColorSwatch color={brand.accentColor} />}
                        <span className="text-xs text-muted-foreground ml-1">{brand.primaryColor}</span>
                      </div>
                    </TableCell>

                    {/* Branches count */}
                    <TableCell className="text-center">
                      {brand._count?.branches ?? 0}
                    </TableCell>

                    {/* Products count */}
                    <TableCell className="text-center hidden sm:table-cell">
                      {brand._count?.products ?? 0}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <ActiveToggleBadge active={brand.isActive} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(brand)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(brand)}
                          disabled={togglingId === brand.id}
                          aria-label={brand.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(brand)}
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
      <BrandFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingBrand={editingBrand}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget && !canDelete(deleteTarget)
            ? t('admin.brands.cannotDelete')
            : t('admin.brands.deleteConfirm')
        }
        description={deleteTarget ? getDeleteDescription(deleteTarget) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        variant={
          deleteTarget && !canDelete(deleteTarget) ? 'default' : 'destructive'
        }
      />
    </main>
  );
}