'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminApi,
  adminPost,
  adminPut,
  adminDelete,
} from '@/lib/admin-api';
import type { Brand, BrandFormData } from '@/lib/admin-types';
import { Skeleton } from '@/components/ui/skeleton';

const emptyForm: BrandFormData = {
  name: '',
  slug: '',
  description: '',
  slogan: '',
  primaryColor: '#e11d48',
  secondaryColor: '#f43f5e',
  accentColor: '#fbbf24',
  isActive: true,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яґєії\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function BrandsPage() {
  const { data: brands, loading, refetch } = useAdminApi<Brand[]>(
    '/api/admin/brands',
    []
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingId(brand.id);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      slogan: brand.slogan || '',
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      accentColor: brand.accentColor,
      isActive: brand.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingId) {
        await adminPut(`/api/admin/brands/${editingId}`, form);
      } else {
        await adminPost('/api/admin/brands', form);
      }
      setDialogOpen(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await adminDelete(`/api/admin/brands/${deleteId}`);
      setDeleteId(null);
      refetch();
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="rounded-lg border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Бренди</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Керування брендами платформи
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Додати бренд
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead>Колір</TableHead>
              <TableHead className="hidden md:table-cell text-center">Філіали</TableHead>
              <TableHead className="hidden md:table-cell text-center">Статус</TableHead>
              <TableHead className="text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  Бренди не знайдено
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-xs">
                    {brand.slug}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: brand.primaryColor }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: brand.secondaryColor }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: brand.accentColor }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {brand.branchCount ?? 0}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                      {brand.isActive ? 'Активний' : 'Неактивний'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(brand)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Редагувати</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(brand.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Видалити</span>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Редагувати бренд' : 'Новий бренд'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="brand-name">Назва</Label>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: !editingId ? slugify(e.target.value) : f.slug,
                  }))
                }
                placeholder="Назва бренду"
              />
            </div>

            {/* Slug */}
            <div className="grid gap-2">
              <Label htmlFor="brand-slug">Slug</Label>
              <Input
                id="brand-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="brand-slug"
                className="font-mono text-sm"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="brand-desc">Опис</Label>
              <Input
                id="brand-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Короткий опис бренду"
              />
            </div>

            {/* Slogan */}
            <div className="grid gap-2">
              <Label htmlFor="brand-slogan">Слоган</Label>
              <Input
                id="brand-slogan"
                value={form.slogan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slogan: e.target.value }))
                }
                placeholder="Слоган бренду"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color-primary">Основний колір</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="color-primary"
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, primaryColor: e.target.value }))
                    }
                    className="h-9 w-9 cursor-pointer rounded border bg-transparent p-0.5"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, primaryColor: e.target.value }))
                    }
                    className="font-mono text-xs h-9"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color-secondary">Додатковий колір</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="color-secondary"
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, secondaryColor: e.target.value }))
                    }
                    className="h-9 w-9 cursor-pointer rounded border bg-transparent p-0.5"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, secondaryColor: e.target.value }))
                    }
                    className="font-mono text-xs h-9"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color-accent">Акцентний колір</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="color-accent"
                    type="color"
                    value={form.accentColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accentColor: e.target.value }))
                    }
                    className="h-9 w-9 cursor-pointer rounded border bg-transparent p-0.5"
                  />
                  <Input
                    value={form.accentColor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accentColor: e.target.value }))
                    }
                    className="font-mono text-xs h-9"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Color preview */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Превʼю:</span>
              <div className="flex gap-1.5">
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: form.primaryColor }}
                />
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: form.secondaryColor }}
                />
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: form.accentColor }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                style={{
                  backgroundColor: form.primaryColor,
                  color: '#fff',
                  borderColor: form.primaryColor,
                }}
              >
                Приклад кнопки
              </Button>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="brand-active">Активний</Label>
              <Switch
                id="brand-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Збереження...' : editingId ? 'Зберегти' : 'Створити'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити бренд?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Бренд буде назавжди видалено з платформи.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Видалення...' : 'Видалити'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}