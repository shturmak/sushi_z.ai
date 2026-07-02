import type { Prisma } from '@prisma/client'

export interface TenantContext {
  brandId: string
  brand: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    accentColor: string | null
    heroBannerUrl: string | null
    promoBannerUrls: string | null
    description: string | null
    slogan: string | null
    isActive: boolean
  }
}

export interface TenantAuthContext extends TenantContext {
  user: {
    userId: string
    role: string
    phone?: string
    email?: string
  }
}

export type BrandWhereInput = Prisma.BrandWhereInput