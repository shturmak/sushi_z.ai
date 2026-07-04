import { db } from '@/lib/db';

// ── Type for brand settings data (plain object, no Prisma metadata) ──

export interface BrandSettingsData {
  enableGuestOrders: boolean;
  enableScheduledOrders: boolean;
  enableLoyalty: boolean;
  enableReviews: boolean;
  enableDelivery: boolean;
  enablePickup: boolean;
  enablePromotions: boolean;
  enableRecommendations: boolean;
  enableSearch: boolean;
  enableFavorites: boolean;
  requirePhone: boolean;
  requireAddress: boolean;
  showTips: boolean;
  enableApplePay: boolean;
  enableDeliveryFeatures: boolean;
  enableCampaigns: boolean;
  enableTranslations: boolean;
  loyaltyRate: number;
  loyaltyMinSpend: number;
  loyaltyMaxBonusPayment: number;
}

// ── Default values matching Prisma schema defaults ─────────────────

export const DEFAULT_SETTINGS: BrandSettingsData = {
  enableGuestOrders: true,
  enableScheduledOrders: true,
  enableLoyalty: true,
  enableReviews: true,
  enableDelivery: true,
  enablePickup: true,
  enablePromotions: true,
  enableRecommendations: true,
  enableSearch: true,
  enableFavorites: true,
  requirePhone: true,
  requireAddress: true,
  showTips: false,
  enableApplePay: true,
  enableDeliveryFeatures: true,
  enableCampaigns: true,
  enableTranslations: false,
  loyaltyRate: 5,
  loyaltyMinSpend: 0,
  loyaltyMaxBonusPayment: 50,
};

// ── Fields that can be updated (exclude id, brandId, timestamps) ──

type UpdatableField = keyof BrandSettingsData;

// ── Extract plain data from a Prisma BrandSettings record ──────────

function toPlain(record: {
  enableGuestOrders: boolean;
  enableScheduledOrders: boolean;
  enableLoyalty: boolean;
  enableReviews: boolean;
  enableDelivery: boolean;
  enablePickup: boolean;
  enablePromotions: boolean;
  enableRecommendations: boolean;
  enableSearch: boolean;
  enableFavorites: boolean;
  requirePhone: boolean;
  requireAddress: boolean;
  showTips: boolean;
  enableApplePay: boolean;
  enableDeliveryFeatures: boolean;
  enableCampaigns: boolean;
  enableTranslations: boolean;
  loyaltyRate: number;
  loyaltyMinSpend: number;
  loyaltyMaxBonusPayment: number;
}): BrandSettingsData {
  return {
    enableGuestOrders: record.enableGuestOrders,
    enableScheduledOrders: record.enableScheduledOrders,
    enableLoyalty: record.enableLoyalty,
    enableReviews: record.enableReviews,
    enableDelivery: record.enableDelivery,
    enablePickup: record.enablePickup,
    enablePromotions: record.enablePromotions,
    enableRecommendations: record.enableRecommendations,
    enableSearch: record.enableSearch,
    enableFavorites: record.enableFavorites,
    requirePhone: record.requirePhone,
    requireAddress: record.requireAddress,
    showTips: record.showTips,
    enableApplePay: record.enableApplePay,
    enableDeliveryFeatures: record.enableDeliveryFeatures,
    enableCampaigns: record.enableCampaigns,
    enableTranslations: record.enableTranslations,
    loyaltyRate: record.loyaltyRate,
    loyaltyMinSpend: record.loyaltyMinSpend,
    loyaltyMaxBonusPayment: record.loyaltyMaxBonusPayment,
  };
}

/**
 * Get brand settings, creating defaults if no record exists yet.
 * Returns a plain object (not the full Prisma model).
 */
export async function getBrandSettings(brandId: string): Promise<BrandSettingsData> {
  let record = await db.brandSettings.findUnique({ where: { brandId } });

  if (!record) {
    record = await db.brandSettings.create({
      data: { brandId },
    });
  }

  return toPlain(record);
}

/**
 * Check if a specific feature is enabled for a brand.
 */
export async function isFeatureEnabled(
  brandId: string,
  feature: keyof BrandSettingsData,
): Promise<boolean> {
  const settings = await getBrandSettings(brandId);
  return Boolean(settings[feature]);
}

/**
 * Update brand settings (partial update).
 */
export async function updateBrandSettings(
  brandId: string,
  data: Partial<BrandSettingsData>,
): Promise<BrandSettingsData> {
  // Only keep fields that belong to BrandSettingsData
  const updateData: Record<string, unknown> = {};
  for (const key of Object.keys(data) as UpdatableField[]) {
    if (key in DEFAULT_SETTINGS) {
      updateData[key] = data[key];
    }
  }

  const record = await db.brandSettings.upsert({
    where: { brandId },
    update: updateData,
    create: { brandId, ...updateData },
  });

  return toPlain(record);
}