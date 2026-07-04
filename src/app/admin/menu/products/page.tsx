'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Plus, X, Search, Upload, PackageCheck, PackageX } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { useAdminPaginatedApi, adminPost, adminPut, adminDelete, adminPatch } from '@/lib/admin-api';
import type { Product, Category, ProductFormData } from '@/lib/admin-types';
import { useT } from '@/i18n';

// ─── Option groups helper types ───
type OptionItem = ProductFormData['optionGroups'][number]['options'][number];
type OptionGroup = ProductFormData['optionGroups'][number];

const emptyForm: ProductFormData = {
  categoryId: '',
  branchId: '',
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  price: 0,
  weight: '',
  calories: 0,
  isVegetarian: false,
  isAvailable: true,
  tags: '',
  allergens: '',
  sortOrder: 0,
  optionGroups: [],
};

export default function ProductsPage() {
  const t = useT();
  const { data: products, loading, refetch } = useAdminPaginatedApi<Product>(
    '/api/admin/menu/products',
  );
  const { data: categories } = useAdminPaginatedApi<Category>(
    '/api/admin/menu/categories',
  );

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredProducts = useMemo(() => {
    let result = products;
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.categoryId === categoryFilter);
    }
    if (stockFilter === 'in') {
      result = result.filter(p => p.isAvailable);
    } else if (stockFilter === 'out') {
      result = result.filter(p => !p.isAvailable);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [products, categoryFilter, stockFilter, searchQuery]);

  // ─── Selection helpers ───
  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));
  const someFilteredSelected = filteredProducts.some(p => selectedIds.has(p.id)) && !allFilteredSelected;

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  }, [allFilteredSelected, filteredProducts]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Quick stock toggle (optimistic) ───
  const handleStockToggle = useCallback(async (prod: Product, checked: boolean) => {
    // Optimistic: update local data immediately
    const previousAvailable = prod.isAvailable;
    Object.assign(prod, { isAvailable: checked });
    // Force re-render by toggling a dummy state — we rely on the object mutation
    // since React won't detect it; use setSelectedIds to trigger re-render
    setSelectedIds(prev => new Set(prev));

    try {
      await adminPatch(`/api/admin/menu/products/${prod.id}`, { isAvailable: checked });
    } catch {
      // Revert on error
      Object.assign(prod, { isAvailable: previousAvailable });
      setSelectedIds(prev => new Set(prev));
    }
  }, []);

  // ─── Batch stock toggle ───
  const handleBatchStock = useCallback(async (available: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const targets = products.filter(p => ids.includes(p.id));
    // Optimistic update
    targets.forEach(p => { Object.assign(p, { isAvailable: available }); });
    setSelectedIds(prev => new Set(prev));

    try {
      await Promise.all(
        ids.map(id => adminPatch(`/api/admin/menu/products/${id}`, { isAvailable: available })),
      );
    } catch {
      // Revert on error
      targets.forEach(p => { Object.assign(p, { isAvailable: !available }); });
      setSelectedIds(prev => new Set(prev));
    }
    setSelectedIds(new Set());
  }, [selectedIds, products]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [optionGroups, setOptionGroups] = useState<ProductFormData['optionGroups']>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync form when editingId changes
  useEffect(() => {
    if (editingId) {
      const prod = products.find(p => p.id === editingId);
      if (prod) {
        setForm({
          categoryId: prod.categoryId,
          branchId: prod.branchId || '',
          name: prod.name,
          slug: prod.slug,
          description: prod.description || '',
          imageUrl: prod.imageUrl || '',
          price: prod.price,
          weight: prod.weight || '',
          calories: prod.calories || 0,
          isVegetarian: prod.isVegetarian ?? false,
          isAvailable: prod.isAvailable,
          tags: typeof prod.tags === 'string' ? JSON.parse(prod.tags).join(', ') : '',
          allergens: typeof prod.allergens === 'string' ? JSON.parse(prod.allergens).join(', ') : '',
          sortOrder: prod.sortOrder,
          optionGroups: [],
        });
        setImagePreview(prod.imageUrl || '');
        // Map option groups for editing
        setOptionGroups(
          prod.optionGroups.map(g => ({
            name: g.name,
            isRequired: g.isRequired,
            maxChoices: g.maxChoices,
            sortOrder: g.sortOrder,
            options: g.options.map(o => ({
              name: o.name,
              priceDelta: o.priceDelta,
              sortOrder: o.sortOrder,
            })),
          })),
        );
      }
    } else {
      setForm(emptyForm);
      setOptionGroups([]);
    }
  }, [editingId, products]);

  // ─── Option group helpers ───
  function addGroup() {
    setOptionGroups(prev => [
      ...prev,
      { name: '', isRequired: false, maxChoices: 1, sortOrder: 0, options: [] },
    ]);
  }

  function removeGroup(index: number) {
    setOptionGroups(prev => prev.filter((_, i) => i !== index));
  }

  function updateGroup(index: number, field: keyof OptionGroup, value: unknown) {
    setOptionGroups(prev =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    );
  }

  function addOption(groupIndex: number) {
    setOptionGroups(prev =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, options: [...g.options, { name: '', priceDelta: 0, sortOrder: 0 }] }
          : g,
      ),
    );
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    setOptionGroups(prev =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, options: g.options.filter((_, oi) => oi !== optionIndex) }
          : g,
      ),
    );
  }

  function updateOption(
    groupIndex: number,
    optionIndex: number,
    field: keyof OptionItem,
    value: unknown,
  ) {
    setOptionGroups(prev =>
      prev.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              options: g.options.map((o, oi) =>
                oi === optionIndex ? { ...o, [field]: value } : o,
              ),
            }
          : g,
      ),
    );
  }

  // ─── CRUD handlers ───
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOptionGroups([]);
    setPendingImageFile(null);
    setImagePreview('');
    setDialogOpen(true);
  }

  function openEdit(prod: Product) {
    setEditingId(prod.id);
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
    const token = (await import('@/lib/admin-api')).useAdminAuth.getState().token;
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
      const body = { ...form, imageUrl, optionGroups };
      if (editingId) {
        await adminPut(`/api/admin/menu/products/${editingId}`, body);
      } else {
        await adminPost('/api/admin/menu/products', body);
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDelete(`/api/admin/menu/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      refetch();
    } catch {
      // error toast handled by admin-api
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <TableSkeleton rows={5} cols={6} />;

  return (
    <>
      <PageHeader
        title={t('admin.products.title')}
        description=""
        action={{ label: t('admin.products.create'), onClick: openCreate }}
      />

      {/* Batch actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-md border bg-muted/50">
          <span className="text-sm font-medium">
            {selectedIds.size} {t('stock.selected')}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchStock(true)}
              className="h-8"
            >
              <PackageCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
              {t('stock.batchInStock')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchStock(false)}
              className="h-8"
            >
              <PackageX className="h-4 w-4 mr-1.5 text-destructive" />
              {t('stock.batchOutOfStock')}
            </Button>
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder={t('admin.products.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.products.allBranches')}</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stockFilter} onValueChange={v => { setStockFilter(v); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('stock.filterAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('stock.filterAll')}</SelectItem>
            <SelectItem value="in">{t('stock.filterInStock')}</SelectItem>
            <SelectItem value="out">{t('stock.filterOutOfStock')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.products.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">{t('common.noData')}</div>
        ) : (
          filteredProducts.map(prod => (
            <Card key={prod.id} className="p-4 gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{prod.name}</div>
                  <div className="text-sm text-muted-foreground">{prod.category.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(prod)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(prod)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{prod.price} ₴</span>
                <div className="flex items-center gap-2">
                  {prod.weight && <span className="text-muted-foreground">{prod.weight}</span>}
                  <Badge variant={prod.isAvailable ? 'secondary' : 'outline'}>
                    {prod.isAvailable ? t('admin.products.available') : t('admin.products.outOfStock')}
                  </Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Table — desktop only */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>{t('admin.products.category')}</TableHead>
              <TableHead>{t('admin.products.name')}</TableHead>
              <TableHead className="text-right">{t('admin.products.price')}</TableHead>
              <TableHead>{t('admin.products.weight')}</TableHead>
              <TableHead className="text-center">{t('admin.products.available')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(prod => (
                <TableRow key={prod.id} data-state={selectedIds.has(prod.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(prod.id)}
                      onCheckedChange={() => toggleSelectOne(prod.id)}
                      aria-label={`Select ${prod.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prod.category.name}
                  </TableCell>
                  <TableCell className="font-medium">{prod.name}</TableCell>
                  <TableCell className="text-right">{prod.price} ₴</TableCell>
                  <TableCell>{prod.weight || '—'}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={prod.isAvailable}
                      onCheckedChange={checked => handleStockToggle(prod, checked)}
                      aria-label={t('stock.toggleStock')}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(prod)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(prod)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('admin.products.edit') : t('admin.products.create')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-category">{t('admin.products.category')} *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('admin.products.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-name">{t('admin.products.name')} *</Label>
                <Input
                  id="prod-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-slug">{t('admin.products.slug')} *</Label>
                <Input
                  id="prod-slug"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-price">{t('admin.products.price')} (₴) *</Label>
                <Input
                  id="prod-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price || ''}
                  onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-weight">{t('admin.products.weight')}</Label>
                <Input
                  id="prod-weight"
                  placeholder={t('admin.products.weight')}
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-calories">{t('admin.products.calories')}</Label>
                <Input
                  id="prod-calories"
                  type="number"
                  min={0}
                  value={form.calories || ''}
                  onChange={e => setForm(f => ({ ...f, calories: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-sort">—</Label>
                <Input
                  id="prod-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="prod-vegetarian"
                  checked={form.isVegetarian}
                  onCheckedChange={checked =>
                    setForm(f => ({ ...f, isVegetarian: checked }))
                  }
                />
                <Label htmlFor="prod-vegetarian">🥬 Вегетаріанське</Label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Switch
                  id="prod-available"
                  checked={form.isAvailable}
                  onCheckedChange={checked =>
                    setForm(f => ({ ...f, isAvailable: checked }))
                  }
                />
                <Label htmlFor="prod-available">{t('admin.products.available')}</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-tags">Теги</Label>
              <Input
                id="prod-tags"
                placeholder="роли, сети, гостре"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Через кому, наприклад: роли, сети, гостре</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-allergens">Алергени</Label>
              <Input
                id="prod-allergens"
                placeholder="риба, молоко, глютен"
                value={form.allergens}
                onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Через кому, наприклад: риба, молоко, глютен</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-desc">{t('admin.products.description')}</Label>
              <Textarea
                id="prod-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* ─── Image Upload ─── */}
            <div className="space-y-2">
              <Label>{t('admin.products.image')}</Label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-32 rounded-lg object-cover border"
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
                    id="prod-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('prod-image')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? t('common.loading') : t('admin.products.uploadImage')}
                  </Button>
                </div>
              )}
              {!imagePreview && !pendingImageFile && (
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP, GIF — max 5MB
                </p>
              )}
            </div>

            <Separator />

            {/* ─── Option Groups Block ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('admin.products.optionGroups')}</h3>
                <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('admin.products.addGroup')}
                </Button>
              </div>

              {optionGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('common.noData')}
                </p>
              )}

              {optionGroups.map((group, gi) => (
                <div
                  key={gi}
                  className="rounded-lg border p-4 space-y-3 relative"
                >
                  {/* Remove group button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => removeGroup(gi)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.products.optionGroupName')}</Label>
                      <Input
                        value={group.name}
                        onChange={e => updateGroup(gi, 'name', e.target.value)}
                        placeholder={t('admin.products.optionGroupName')}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('admin.products.optionMaxChoices')}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={group.maxChoices}
                        onChange={e =>
                          updateGroup(gi, 'maxChoices', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="flex items-end gap-3 pb-0.5">
                      <Switch
                        checked={group.isRequired}
                        onCheckedChange={checked =>
                          updateGroup(gi, 'isRequired', checked)
                        }
                      />
                      <Label className="text-xs">{t('admin.products.optionRequired')}</Label>
                    </div>
                  </div>

                  {/* Options within this group */}
                  <div className="space-y-2 pl-2">
                    {group.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          value={opt.name}
                          onChange={e =>
                            updateOption(gi, oi, 'name', e.target.value)
                          }
                          placeholder={t('admin.products.optionName')}
                          className="flex-1"
                        />
                        <div className="relative w-28">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={opt.priceDelta || ''}
                            onChange={e =>
                              updateOption(
                                gi,
                                oi,
                                'priceDelta',
                                Number(e.target.value),
                              )
                            }
                            className="pr-7"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            ₴
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeOption(gi, oi)}
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addOption(gi)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {t('admin.products.addOption')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

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
        title={t('admin.products.deleteConfirm')}
        description={`"${deleteTarget?.name}"`}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}