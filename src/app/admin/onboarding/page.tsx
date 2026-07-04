'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  CheckCircle,
  Store,
  MapPin,
  UtensilsCrossed,
  Rocket,
  ArrowRight,
  ArrowLeft,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n';
import { useAdminAuth } from '@/lib/admin-auth';
import { useBrandStore } from '@/lib/brand-store';
import { useAdminApi } from '@/lib/admin-api';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────
interface BrandData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BranchData {
  name: string;
  slug: string;
  address: string;
  phone: string;
  workSchedule: string;
  prepTimeMinutes: string;
  autoConfirm: boolean;
  acceptingOrders: boolean;
}

interface QuickMenuData {
  categoryName: string;
  productName: string;
  productPrice: string;
}

interface ExistingBrand {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string | null;
  description: string | null;
  _count: { branches: number; products: number };
}

// ─── Slug helper ────────────────────────────────────────────
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

// ─── API helper (raw fetch with token) ──────────────────────
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = useAdminAuth.getState().token;
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error?.message || `Request failed (${res.status})`);
  return (json as { success: boolean; data: T }).data;
}

async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error?.message || `Request failed (${res.status})`);
  return (json as { success: boolean; data: T }).data;
}

// ─── Step definitions ───────────────────────────────────────
const STEPS = [
  { key: 'brand', icon: Store, labelKey: 'onboarding.brandInfo' },
  { key: 'branch', icon: MapPin, labelKey: 'onboarding.branchInfo' },
  { key: 'menu', icon: UtensilsCrossed, labelKey: 'onboarding.menuSetup' },
  { key: 'launch', icon: Rocket, labelKey: 'onboarding.launchReady' },
] as const;

const DEFAULT_SCHEDULE = JSON.stringify({
  mon: '10:00-22:00',
  tue: '10:00-22:00',
  wed: '10:00-22:00',
  thu: '10:00-22:00',
  fri: '10:00-23:00',
  sat: '10:00-23:00',
  sun: '11:00-21:00',
});

// ─── Stepper Component ──────────────────────────────────────
function Stepper({ currentStep }: { currentStep: number }) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i <= currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t(step.labelKey)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 mt-[-1.25rem] sm:mt-0 transition-colors ${
                  i < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Brand Info ─────────────────────────────────────
function StepBrand({
  form,
  setForm,
  existingBrand,
}: {
  form: BrandData;
  setForm: React.Dispatch<React.SetStateAction<BrandData>>;
  existingBrand: ExistingBrand | null;
}) {
  const t = useT();

  const update = <K extends keyof BrandData>(key: K, value: BrandData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.brandInfo')}</CardTitle>
        <CardDescription>{t('onboarding.brandColors')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingBrand && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Badge variant="secondary">{t('onboarding.alreadyConfigured')}</Badge>
            <span className="text-sm text-muted-foreground">
              {existingBrand.name} — {existingBrand._count.branches} {t('admin.brands.branches').toLowerCase()}, {existingBrand._count.products} {t('admin.brands.products').toLowerCase()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ob-brand-name">{t('onboarding.brandName')}</Label>
            <Input
              id="ob-brand-name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('admin.brands.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-brand-slug">{t('onboarding.brandSlug')}</Label>
            <Input
              id="ob-brand-slug"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              placeholder="my-brand"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-brand-desc">{t('onboarding.brandDescription')}</Label>
          <Textarea
            id="ob-brand-desc"
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder={t('admin.brands.descriptionPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ob-primary-color">{t('onboarding.primaryColor')}</Label>
            <div className="flex items-center gap-2">
              <input
                id="ob-primary-color"
                type="color"
                value={form.primaryColor}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-secondary-color">{t('onboarding.secondaryColor')}</Label>
            <div className="flex items-center gap-2">
              <input
                id="ob-secondary-color"
                type="color"
                value={form.secondaryColor}
                onChange={(e) => update('secondaryColor', e.target.value)}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input"
              />
              <Input
                value={form.secondaryColor}
                onChange={(e) => update('secondaryColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Branch ─────────────────────────────────────────
function StepBranch({
  form,
  setForm,
}: {
  form: BranchData;
  setForm: React.Dispatch<React.SetStateAction<BranchData>>;
}) {
  const t = useT();

  const update = <K extends keyof BranchData>(key: K, value: BranchData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.branchInfo')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ob-branch-name">{t('onboarding.branchName')}</Label>
            <Input
              id="ob-branch-name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-branch-slug">{t('onboarding.brandSlug')}</Label>
            <Input
              id="ob-branch-slug"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              placeholder="main-branch"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ob-branch-address">{t('onboarding.branchAddress')}</Label>
            <Input
              id="ob-branch-address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-branch-phone">{t('onboarding.branchPhone')}</Label>
            <Input
              id="ob-branch-phone"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+380..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-branch-schedule">{t('onboarding.branchSchedule')}</Label>
          <Input
            id="ob-branch-schedule"
            value={form.workSchedule}
            onChange={(e) => update('workSchedule', e.target.value)}
            placeholder={DEFAULT_SCHEDULE}
          />
          <p className="text-xs text-muted-foreground">
            JSON format: {`{"mon": "10:00-22:00", ...}`}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-prep-time">{t('onboarding.estimatedTime')} (min)</Label>
          <Input
            id="ob-prep-time"
            type="number"
            value={form.prepTimeMinutes}
            onChange={(e) => update('prepTimeMinutes', e.target.value)}
            placeholder="30"
            className="max-w-[200px]"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div className="flex items-center gap-3">
            <Switch
              id="ob-auto-confirm"
              checked={form.autoConfirm}
              onCheckedChange={(checked) => update('autoConfirm', checked)}
            />
            <Label htmlFor="ob-auto-confirm" className="cursor-pointer">
              Auto-confirm
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="ob-accepting"
              checked={form.acceptingOrders}
              onCheckedChange={(checked) => update('acceptingOrders', checked)}
            />
            <Label htmlFor="ob-accepting" className="cursor-pointer">
              Accepting orders
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Menu ───────────────────────────────────────────
function StepMenu({
  form,
  setForm,
  saving,
  onQuickAdd,
}: {
  form: QuickMenuData;
  setForm: React.Dispatch<React.SetStateAction<QuickMenuData>>;
  saving: boolean;
  onQuickAdd: () => void;
}) {
  const t = useT();

  const update = <K extends keyof QuickMenuData>(key: K, value: QuickMenuData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.menuSetup')}</CardTitle>
        <CardDescription>
          Use the Menu section to add categories and products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <a href="/admin/menu/categories">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            {t('admin.sidebar.menu')} → {t('admin.sidebar.categories')}
          </a>
        </Button>

        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-3">{t('onboarding.addCategory')} & {t('onboarding.addProduct')}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onQuickAdd();
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div className="space-y-1">
              <Label htmlFor="ob-cat-name" className="text-xs">{t('onboarding.addCategory')}</Label>
              <Input
                id="ob-cat-name"
                value={form.categoryName}
                onChange={(e) => update('categoryName', e.target.value)}
                placeholder="Роли"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ob-prod-name" className="text-xs">{t('onboarding.addProduct')}</Label>
              <Input
                id="ob-prod-name"
                value={form.productName}
                onChange={(e) => update('productName', e.target.value)}
                placeholder="Філадельфія"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ob-prod-price" className="text-xs">Price</Label>
              <div className="flex gap-2">
                <Input
                  id="ob-prod-price"
                  type="number"
                  value={form.productPrice}
                  onChange={(e) => update('productPrice', e.target.value)}
                  placeholder="189"
                  className="flex-1"
                />
                <Button type="submit" disabled={saving}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Launch ─────────────────────────────────────────
function StepLaunch({ brandName }: { brandName: string }) {
  const t = useT();
  const slug = useBrandStore((s) => s.currentBrand?.slug);

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{t('onboarding.launchReady')}</h2>
          <p className="text-muted-foreground max-w-md">
            {t('onboarding.launchMessage')}
          </p>
          {brandName && (
            <Badge variant="outline" className="text-base px-4 py-1">
              {brandName}
            </Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <a href={slug ? `/store/${slug}` : '/store'}>
              <Store className="h-4 w-4 mr-2" />
              {t('onboarding.launchGoToStore')}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/admin">
              {t('onboarding.launchGoToAdmin')}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function OnboardingPage() {
  const t = useT();
  const authBrandId = useAdminAuth((s) => s.brandId);
  const storeBrand = useBrandStore((s) => s.currentBrand);
  const setBrandStore = useBrandStore((s) => s.setCurrentBrand);

  // Fetch existing brands
  const { data: brands, loading: brandsLoading } = useAdminApi<ExistingBrand[]>('/api/admin/brands', []);

  const existingBrand = brands?.find((b) => b.id === authBrandId) ?? brands?.[0] ?? null;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Brand form
  const [brandForm, setBrandForm] = useState<BrandData>({
    name: existingBrand?.name ?? '',
    slug: existingBrand?.slug ?? '',
    description: existingBrand?.description ?? '',
    primaryColor: existingBrand?.primaryColor ?? '#6366f1',
    secondaryColor: existingBrand?.secondaryColor ?? '#eef2ff',
    id: existingBrand?.id,
  });

  // Branch form
  const [branchForm, setBranchForm] = useState<BranchData>({
    name: '',
    slug: '',
    address: '',
    phone: '',
    workSchedule: DEFAULT_SCHEDULE,
    prepTimeMinutes: '30',
    autoConfirm: false,
    acceptingOrders: true,
  });

  // Quick menu form
  const [menuForm, setMenuForm] = useState<QuickMenuData>({
    categoryName: '',
    productName: '',
    productPrice: '',
  });

  // Sync brand form when data loads
  useEffect(() => {
    if (existingBrand && !brandForm.id) {
      setBrandForm({
        id: existingBrand.id,
        name: existingBrand.name,
        slug: existingBrand.slug,
        description: existingBrand.description ?? '',
        primaryColor: existingBrand.primaryColor,
        secondaryColor: existingBrand.secondaryColor ?? '#eef2ff',
      });
    }
  }, [existingBrand, brandForm.id]);

  // Navigation
  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // Save brand
  const saveBrand = async (): Promise<string> => {
    if (brandForm.id) {
      await apiPut(`/api/admin/brands/${brandForm.id}`, {
        name: brandForm.name,
        slug: brandForm.slug,
        description: brandForm.description || null,
        primaryColor: brandForm.primaryColor,
        secondaryColor: brandForm.secondaryColor || null,
      });
      return brandForm.id;
    }
    // Create new brand
    const newBrand = await apiPost<{ id: string; name: string; slug: string; primaryColor: string; secondaryColor: string | null; logoUrl: string | null }>('/api/admin/brands', {
      name: brandForm.name,
      slug: brandForm.slug,
      description: brandForm.description || null,
      primaryColor: brandForm.primaryColor,
      secondaryColor: brandForm.secondaryColor || null,
      isActive: true,
    });
    return newBrand.id;
  };

  // Save branch
  const saveBranch = async () => {
    await apiPost('/api/admin/branches', {
      name: branchForm.name,
      slug: branchForm.slug,
      address: branchForm.address,
      phone: branchForm.phone || null,
      workSchedule: branchForm.workSchedule || null,
      prepTimeMinutes: parseInt(branchForm.prepTimeMinutes, 10) || 30,
      autoConfirm: branchForm.autoConfirm,
      acceptingOrders: branchForm.acceptingOrders,
    });
  };

  // Quick add category + product
  const handleQuickAdd = async () => {
    if (!menuForm.categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    if (!menuForm.productName.trim() || !menuForm.productPrice) {
      toast.error('Product name and price are required');
      return;
    }

    setSaving(true);
    try {
      const cat = await apiPost<{ id: string }>('/api/admin/menu/categories', {
        name: menuForm.categoryName,
        slug: slugify(menuForm.categoryName),
      });

      await apiPost('/api/admin/menu/products', {
        categoryId: cat.id,
        name: menuForm.productName,
        slug: slugify(menuForm.productName),
        price: parseFloat(menuForm.productPrice),
      });

      toast.success('Category + product added');
      setMenuForm({ categoryName: '', productName: '', productPrice: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Step actions
  const handleNext = async () => {
    if (step === 0) {
      // Validate brand step
      if (!brandForm.name.trim() || !brandForm.slug.trim()) {
        toast.error('Brand name and slug are required');
        return;
      }
      setSaving(true);
      try {
        const brandId = await saveBrand();
        // Update brand store
        if (!storeBrand || storeBrand.id !== brandId) {
          const targetBrand = brands?.find((b) => b.id === brandId);
          if (targetBrand) {
            setBrandStore({
              id: targetBrand.id,
              name: targetBrand.name,
              slug: targetBrand.slug,
              primaryColor: targetBrand.primaryColor,
              secondaryColor: targetBrand.secondaryColor ?? '',
              logoUrl: null,
            });
          }
        }
        toast.success('Brand saved');
        goNext();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save brand';
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    } else if (step === 1) {
      // Validate branch step
      if (!branchForm.name.trim() || !branchForm.slug.trim() || !branchForm.address.trim()) {
        toast.error('Branch name, slug, and address are required');
        return;
      }
      setSaving(true);
      try {
        await saveBranch();
        toast.success('Branch created');
        goNext();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create branch';
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    } else if (step === 2) {
      // Menu step - just go to launch
      goNext();
    }
  };

  if (brandsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.title')}</h1>
        <p className="text-muted-foreground">{t('onboarding.subtitle')}</p>
      </div>

      <Stepper currentStep={step} />

      {step === 0 && (
        <StepBrand form={brandForm} setForm={setBrandForm} existingBrand={existingBrand} />
      )}
      {step === 1 && (
        <StepBranch form={branchForm} setForm={setBranchForm} />
      )}
      {step === 2 && (
        <StepMenu form={menuForm} setForm={setMenuForm} saving={saving} onQuickAdd={handleQuickAdd} />
      )}
      {step === 3 && (
        <StepLaunch brandName={brandForm.name} />
      )}

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('onboarding.back')}
          </Button>

          <div className="flex gap-2">
            {step < 3 && (
              <Button
                variant="ghost"
                onClick={goNext}
                disabled={saving}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                {t('onboarding.skip')}
              </Button>
            )}
            <Button onClick={handleNext} disabled={saving}>
              {step === 2 ? t('onboarding.complete') : t('onboarding.next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}