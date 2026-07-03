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
import { Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { useAdminPaginatedApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import type { Category, CategoryFormData } from '@/lib/admin-types';

const emptyForm: CategoryFormData = {
  branchId: '',
  name: '',
  slug: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const { data: categories, loading, refetch } = useAdminPaginatedApi<Category>(
    '/api/admin/menu/categories',
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

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
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
        });
      }
    } else {
      setForm(emptyForm);
    }
  }, [editingId, categories]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await adminPut(`/api/admin/menu/categories/${editingId}`, form);
      } else {
        await adminPost('/api/admin/menu/categories', form);
      }
      setDialogOpen(false);
      setEditingId(null);
      refetch();
    } catch {
      // error toast handled by admin-api
    } finally {
      setSubmitting(false);
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
        title="Категорії"
        description="Керування категоріями меню"
        action={{ label: 'Додати категорію', onClick: openCreate }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Продукти</TableHead>
              <TableHead className="text-center">Порядок</TableHead>
              <TableHead className="text-center">Активна</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Немає категорій
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
              {editingId ? 'Редагувати категорію' : 'Нова категорія'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Назва *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug *</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Опис</Label>
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-sort">Порядок сортування</Label>
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
              <Label htmlFor="cat-active">Активна</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Збереження...' : editingId ? 'Оновити' : 'Створити'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Видалити категорію?"
        description={`Ви впевнені, що хочете видалити категорію "${deleteTarget?.name}"? Цю дію неможливо скасувати.`}
        confirmLabel="Видалити"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}