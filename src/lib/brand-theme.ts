import type { TenantContext } from '@/lib/tenant';

/**
 * Convert brand color palette to CSS custom properties.
 * These can be injected into a component's style or a page's <style> tag
 * to theme the entire UI per brand.
 */
export function brandToCssVars(
  brand: TenantContext['brand'],
): Record<string, string> {
  return {
    '--brand-primary': brand.primaryColor,
    '--brand-secondary': brand.secondaryColor,
    '--brand-accent': brand.accentColor,
  };
}

/**
 * Generate page metadata (title + description) from brand info.
 * Uses the brand slogan if available, falls back to description,
 * then to a generic template.
 */
export function brandToMetadata(
  brand: TenantContext['brand'],
): { title: string; description: string } {
  const title = `${brand.name} — Замовлення доставки`;

  const description =
    brand.slogan || brand.description || `Замовляйте ${brand.name} з доставкою`;

  return { title, description };
}