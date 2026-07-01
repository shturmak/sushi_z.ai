// TenantContext — passed to all domain services
export interface TenantContext {
  brandId: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    heroBannerUrl: string | null;
    promoBannerUrls: string | null;
    description: string | null;
    slogan: string | null;
    isActive: boolean;
  };
}

// Brand resolution error
export class TenantError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'TenantError';
  }
}