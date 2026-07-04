'use client';

import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAdminApi, adminPost, adminPut, adminDelete } from '@/lib/admin-api';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// ─── Types ──────────────────────────────────────────────────
interface Translation {
  id: string;
  brandId: string;
  locale: string;
  entityType: string;
  entityId: string;
  name: string | null;
  description: string | null;
  originalName: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductOrCategory {
  id: string;
  name: string;
}

const LOCALE_OPTIONS = [
  { value: 'uk', label: '🇺🇦 Українська' },
  { value: 'ru', label: '🇷🇺 Русский' },
  { value: 'en', label: '🇬🇧 English' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'Product', label: 'Product' },
  { value: 'Category', label: 'Category' },
];

const LOCALE_MAP: Record<string, string> = {
  uk: '🇺🇦 UK',
  ru: '🇷🇺 RU',
  en: '🇬🇧 EN',
};

// ─── Translation Form Dialog ────────────────────────────────
function TranslationFormDialog({
  open,
  onOpenChange,
  editing,
  availableProducts,
  availableCategories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Translation | null;
  availableProducts: ProductOrCategory[];
  availableCategories: ProductOrCategory[];
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = editing !== null;

  const [locale, setLocale] = useState('ru');
  const [entityType, setEntityType] = useState('Product');
  const [entityId, setEntityId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback((tr: Translation | null) => {
    if (tr) {
      setLocale(tr.locale);
      setEntityType(tr.entityType);
      setEntityId(tr.entityId);
      setName(tr.name ?? '');
      setDescription(tr.description ?? '');
    } else {
      setLocale('ru');
      setEntityType('Product');
      setEntityId('');
      setName('');
      setDescription('');
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm(editing);
    }
    onOpenChange(nextOpen);
  };

  const entityOptions = entityType === 'Product' ? availableProducts : availableCategories;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!entityId || !locale || !entityType) return;

    setSaving(true);
    try {
      const body = { locale, entityType, entityId, name: name || null, description: description || null };

      if (isEdit && editing) {
        await adminPut(`/api/admin/translations/${editing.id}`, { name, description });
      } else {
        await adminPost('/api/admin/translations', body);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      // handled by adminPost/adminPut
    } finally {
      setSaving(false);
    }
  };

  const originalName = isEdit && editing ? editing.originalName
    : entityOptions.find(e => e.id === entityId)?.name ?? '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('common.edit') : t('translation.save')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('translation.translatedName')
              : t('translation.save')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Locale + Entity Type (only for create) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('translation.locale')}</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('translation.type')}</Label>
                <Select value={entityType} onValueChange={(v) => { setEntityType(v); setEntityId(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.value === 'Product' ? t('translation.product') : t('translation.category')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Entity selector (only for create) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label>{t('translation.entity')}</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={entityType === 'Product' ? t('translation.product') : t('translation.category')} />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Original name (read-only) */}
          <div className="space-y-2">
            <Label>{t('translation.originalName')}</Label>
            <Input value={originalName} readOnly className="bg-muted" />
          </div>

          {/* Translated name */}
          <div className="space-y-2">
            <Label>{t('translation.translatedName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={originalName}
            />
          </div>

          {/* Translated description */}
          <div className="space-y-2">
            <Label>{t('translation.translatedDesc')}</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || (!isEdit && !entityId)}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function TranslationsPage() {
  const t = useT();
  const { data: translations, loading, refetch } = useAdminApi<Translation[]>('/api/admin/translations', []);

  // Filters
  const [filterLocale, setFilterLocale] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = translations;
    if (filterLocale !== 'all') {
      list = list.filter(tr => tr.locale === filterLocale);
    }
    if (filterType !== 'all') {
      list = list.filter(tr => tr.entityType === filterType);
    }
    return list;
  }, [translations, filterLocale, filterType]);

  // Available entities for the create dialog
  const { data: products } = useAdminApi<ProductOrCategory[]>('/api/admin/menu/products', []);
  const { data: categories } = useAdminApi<ProductOrCategory[]>('/api/admin/menu/categories', []);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);

  const handleOpenCreate = () => {
    setEditingTranslation(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (tr: Translation) => {
    setEditingTranslation(tr);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    refetch();
  };

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Translation | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDelete(`/api/admin/translations/${deleteTarget.id}`);
      refetch();
    } catch {
      // handled
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('translation.title')}
        description=""
        action={{ label: t('translation.save'), onClick: handleOpenCreate }}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterLocale} onValueChange={setFilterLocale}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('translation.locale')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {LOCALE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('translation.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {ENTITY_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.value === 'Product' ? t('translation.product') : t('translation.category')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('translation.originalName')}</TableHead>
                <TableHead>{t('translation.translatedName')}</TableHead>
                <TableHead>{t('translation.locale')}</TableHead>
                <TableHead>{t('translation.type')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('translation.noTranslations')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {tr.originalName}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {tr.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{LOCALE_MAP[tr.locale] ?? tr.locale}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tr.entityType === 'Product' ? 'default' : 'secondary'}>
                        {tr.entityType === 'Product' ? t('translation.product') : t('translation.category')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(tr)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tr)}
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
      <TranslationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingTranslation}
        availableProducts={products}
        availableCategories={categories}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('common.delete')}
        description={deleteTarget ? `${deleteTarget.originalName} — ${LOCALE_MAP[deleteTarget.locale] ?? deleteTarget.locale}` : ''}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </main>
  );
}