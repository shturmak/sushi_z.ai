'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { useT } from '@/i18n';
import { useAdminApi } from '@/lib/admin-api';
import { useBrandStore } from '@/lib/brand-store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { BrandSettingsData } from '@/lib/feature-flags';

// ── Types ──────────────────────────────────────────────────────────

interface BrandInfo {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currency: string;
  currencySymbol: string;
}

interface BrandSettingsResponse {
  brand: BrandInfo | null;
  [K: keyof BrandSettingsData]: unknown;
}

// ── Boolean feature keys for toggle switches ───────────────────────

const TOGGLE_KEYS: (keyof BrandSettingsData)[] = [
  'enableGuestOrders',
  'enableScheduledOrders',
  'enableLoyalty',
  'enableReviews',
  'enableDelivery',
  'enablePickup',
  'enablePromotions',
  'enableRecommendations',
  'enableSearch',
  'enableFavorites',
  'requirePhone',
  'requireAddress',
  'showTips',
  'enableApplePay',
  'enableDeliveryFeatures',
  'enableCampaigns',
  'enableTranslations',
];

// ── Feature group definitions ──────────────────────────────────────

interface FeatureGroup {
  titleKey: string;
  keys: (keyof BrandSettingsData)[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    titleKey: 'brandSettings.enableDelivery',
    keys: ['enableGuestOrders', 'enableScheduledOrders', 'enableDelivery', 'enablePickup'],
  },
  {
    titleKey: 'brandSettings.enablePromotions',
    keys: ['enablePromotions', 'enableCampaigns', 'enableRecommendations', 'enableSearch'],
  },
  {
    titleKey: 'brandSettings.enableReviews',
    keys: ['enableReviews', 'enableFavorites', 'enableTranslations'],
  },
  {
    titleKey: 'brandSettings.enableDeliveryFeatures',
    keys: ['enableDeliveryFeatures', 'enableApplePay'],
  },
];

// ── Toggle switch row component ────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function BrandSettingsPage() {
  const t = useT();
  const brand = useBrandStore((s) => s.currentBrand);

  // Fetch settings
  const { data, loading, refetch } = useAdminApi<BrandSettingsResponse>(
    '/api/admin/brand-settings',
    {} as BrandSettingsResponse,
  );

  // Local state for editing
  const [settings, setSettings] = useState<Partial<BrandSettingsData>>({});
  const [brandFields, setBrandFields] = useState<BrandInfo>({
    name: '',
    primaryColor: '#e11d48',
    secondaryColor: '',
    accentColor: '',
    currency: 'UAH',
    currencySymbol: '₴',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync fetched data into local state
  useEffect(() => {
    if (!data || loading) return;
    const freshSettings: Partial<BrandSettingsData> = {};
    for (const key of TOGGLE_KEYS) {
      freshSettings[key] = Boolean(data[key]);
    }
    freshSettings.loyaltyRate = Number(data.loyaltyRate) ?? 5;
    freshSettings.loyaltyMinSpend = Number(data.loyaltyMinSpend) ?? 0;
    freshSettings.loyaltyMaxBonusPayment = Number(data.loyaltyMaxBonusPayment) ?? 50;
    setSettings(freshSettings);

    if (data.brand) {
      setBrandFields({
        name: data.brand.name ?? brand?.name ?? '',
        primaryColor: data.brand.primaryColor ?? '#e11d48',
        secondaryColor: data.brand.secondaryColor ?? '',
        accentColor: data.brand.accentColor ?? '',
        currency: data.brand.currency ?? 'UAH',
        currencySymbol: data.brand.currencySymbol ?? '₴',
      });
    }
    setDirty(false);
  }, [data, loading, brand?.name]);

  // Update a boolean setting
  const toggleSetting = useCallback((key: keyof BrandSettingsData) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  }, []);

  // Update a number setting
  const updateNumber = useCallback((key: 'loyaltyRate' | 'loyaltyMinSpend' | 'loyaltyMaxBonusPayment', value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      setSettings((prev) => ({ ...prev, [key]: num }));
      setDirty(true);
    }
  }, []);

  // Update a brand field
  const updateBrandField = useCallback((key: keyof BrandInfo, value: string) => {
    setBrandFields((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/brand-settings' + (brand?.id ? `?brandId=${brand.id}` : ''), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token') ?? ''}` },
        body: JSON.stringify({ ...settings, brand: brandFields }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || 'Save failed');
      } else {
        toast.success(t('brandSettings.saved'));
        setDirty(false);
        refetch();
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [settings, brandFields, brand?.id, t, refetch]);

  if (loading) {
    return (
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <PageHeader title={t('brandSettings.title')} />
        <Skeleton className="h-10 w-96" />
        <div className="grid gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={t('brandSettings.title')} />
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('common.save')}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('brandSettings.general')}</TabsTrigger>
          <TabsTrigger value="features">{t('brandSettings.features')}</TabsTrigger>
          <TabsTrigger value="checkout">{t('brandSettings.checkout')}</TabsTrigger>
          <TabsTrigger value="loyalty">{t('brandSettings.loyalty')}</TabsTrigger>
        </TabsList>

        {/* ── General Tab ──────────────────────────────────── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t('brandSettings.general')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* Brand name (read-only) */}
              <div className="space-y-2">
                <Label>{t('brandSettings.brandName')}</Label>
                <Input value={brandFields.name} readOnly className="bg-muted" />
              </div>

              <Separator />

              {/* Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">{t('brandSettings.primaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primaryColor"
                      type="color"
                      value={brandFields.primaryColor}
                      onChange={(e) => updateBrandField('primaryColor', e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={brandFields.primaryColor}
                      onChange={(e) => updateBrandField('primaryColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">{t('brandSettings.secondaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="secondaryColor"
                      type="color"
                      value={brandFields.secondaryColor || '#000000'}
                      onChange={(e) => updateBrandField('secondaryColor', e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={brandFields.secondaryColor}
                      onChange={(e) => updateBrandField('secondaryColor', e.target.value)}
                      className="flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">{t('brandSettings.accentColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accentColor"
                      type="color"
                      value={brandFields.accentColor || '#000000'}
                      onChange={(e) => updateBrandField('accentColor', e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={brandFields.accentColor}
                      onChange={(e) => updateBrandField('accentColor', e.target.value)}
                      className="flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('brandSettings.currency')}</Label>
                  <Input
                    id="currency"
                    value={brandFields.currency}
                    onChange={(e) => updateBrandField('currency', e.target.value)}
                    placeholder="UAH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">{t('brandSettings.currencySymbol')}</Label>
                  <Input
                    id="currencySymbol"
                    value={brandFields.currencySymbol}
                    onChange={(e) => updateBrandField('currencySymbol', e.target.value)}
                    placeholder="₴"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Features Tab ─────────────────────────────────── */}
        <TabsContent value="features">
          <div className="grid gap-4">
            {FEATURE_GROUPS.map((group) => (
              <Card key={group.titleKey}>
                <CardHeader>
                  <CardTitle>{t(group.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1">
                  {group.keys.map((key) => (
                    <ToggleRow
                      key={key}
                      label={t(`brandSettings.${key}`)}
                      checked={Boolean(settings[key])}
                      onChange={() => toggleSetting(key)}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Checkout Tab ─────────────────────────────────── */}
        <TabsContent value="checkout">
          <Card>
            <CardHeader>
              <CardTitle>{t('brandSettings.checkout')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1">
              <ToggleRow
                label={t('brandSettings.requirePhone')}
                checked={Boolean(settings.requirePhone)}
                onChange={() => toggleSetting('requirePhone')}
              />
              <ToggleRow
                label={t('brandSettings.requireAddress')}
                checked={Boolean(settings.requireAddress)}
                onChange={() => toggleSetting('requireAddress')}
              />
              <ToggleRow
                label={t('brandSettings.showTips')}
                checked={Boolean(settings.showTips)}
                onChange={() => toggleSetting('showTips')}
              />
              <ToggleRow
                label={t('brandSettings.enableApplePay')}
                checked={Boolean(settings.enableApplePay)}
                onChange={() => toggleSetting('enableApplePay')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Loyalty Tab ──────────────────────────────────── */}
        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>{t('brandSettings.loyalty')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ToggleRow
                label={t('brandSettings.enableLoyalty')}
                checked={Boolean(settings.enableLoyalty)}
                onChange={() => toggleSetting('enableLoyalty')}
              />

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loyaltyRate">{t('brandSettings.loyaltyRate')}</Label>
                  <Input
                    id="loyaltyRate"
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={settings.loyaltyRate ?? 5}
                    onChange={(e) => updateNumber('loyaltyRate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loyaltyMinSpend">{t('brandSettings.loyaltyMinSpend')}</Label>
                  <Input
                    id="loyaltyMinSpend"
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={settings.loyaltyMinSpend ?? 0}
                    onChange={(e) => updateNumber('loyaltyMinSpend', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loyaltyMaxBonusPayment">{t('brandSettings.loyaltyMaxBonusPayment')}</Label>
                  <Input
                    id="loyaltyMaxBonusPayment"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={settings.loyaltyMaxBonusPayment ?? 50}
                    onChange={(e) => updateNumber('loyaltyMaxBonusPayment', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}