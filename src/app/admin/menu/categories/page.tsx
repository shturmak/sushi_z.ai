'use client';

import { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { useAdminPaginatedApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import type { Category, CategoryFormData } from '@/lib/admin-types';
import { useT } from '@/i18n';

const emptyForm: CategoryFormData = {
  branchId: '',
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const t = useT();
  const { data: categories, loading, refetch } = useAdminPaginatedApi<Category>(
    '/api/admin/menu/categories',
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync form when editingId changes
  useEffect(() => {
    if (editingId) {
      const cat = categories.find(c => c.id === editingId);
      if (cat) {
        setForm({
          branchId: cat.branchId || '',
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          imageUrl: cat.imageUrl || '',
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
        });
        setImagePreview(cat.imageUrl || '');
      }
    } else {
      setForm(emptyForm);
    }
  }, [editingId, categories]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setPendingImageFile(null);
    setImagePreview('');
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setDialogOpen(true);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setPendingImageFile(null);
    setImagePreview('');
    setForm(f => ({ ...f, imageUrl: '' }));
  }

  async function uploadImage(file: File): Promise<string | null> {
    const { useAdminAuth } = await import('@/lib/admin-api');
    const token = useAdminAuth.getState().token;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error?.message || 'Upload failed');
    return json.data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = form.imageUrl;
      if (pendingImageFile) {
        setUploading(true);
        const url = await uploadImage(pendingImageFile);
        imageUrl = url || '';
        setUploading(false);
      }
      const body = { ...form, imageUrl };
      if (editingId) {
        await adminPut(`/api/admin/menu/categories/${editingId}`, body);
      } else {
        await adminPost('/api/admin/menu/categories', body);
      }
      setDialogOpen(false);
      setEditingId(null);
      setPendingImageFile(null);
      refetch();
    } catch {
      // error toast handled by admin-api
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  async function handleToggle(cat: Category) {
    try {
      await adminPut(`/api/admin/menu/categories/${cat.id}`, {
        isActive: !cat.isActive,
      });
      refetch();
    } catch {
      // error toast handled by admin-api
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDelete(`/api/admin/menu/categories/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch {
      // error toast handled by admin-api
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <>
      <PageHeader
        title={t('admin.categories.title')}
        description=""
        action={{ label: t('admin.categories.create'), onClick: openCreate }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.categories.name')}</TableHead>
              <TableHead>{t('admin.categories.slug')}</TableHead>
              <TableHead className="text-center">{t('admin.categories.products')}</TableHead>
              <TableHead className="text-center">—</TableHead>
              <TableHead className="text-center">—</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              categories.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="text-center">{cat._count?.products ?? 0}</TableCell>
                  <TableCell className="text-center">{cat.sortOrder}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={() => handleToggle(cat)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('admin.categories.edit') : t('admin.categories.create')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t('admin.categories.name')} *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">{t('admin.categories.slug')} *</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">{t('admin.categories.description')}</Label>
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* ─── Image Upload ─── */}
            <div className="space-y-2">
              <Label>{t('admin.categories.image')}</Label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-lg object-cover border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    id="cat-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('cat-image')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t('common.loading') : t('admin.categories.uploadImage')}
                  </Button>
                </div>
              )}
              {!imagePreview && !pendingImageFile && (
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP, GIF — max 5MB
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-sort">—</Label>
              <Input
                id="cat-sort"
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="cat-active"
                checked={form.isActive}
                onCheckedChange={checked => setForm(f => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="cat-active">—</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('common.loading') : editingId ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title={t('admin.categories.deleteConfirm')}
        description={`"${deleteTarget?.name}"`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}