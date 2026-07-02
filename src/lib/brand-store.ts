'use client'
import { create } from 'zustand'

interface BrandInfo {
  id: string
  name: string
  slug: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

interface BrandStore {
  currentBrandId: string | null
  currentBrand: BrandInfo | null
  setCurrentBrand: (brand: BrandInfo) => void
  clearBrand: () => void
}

export const useBrandStore = create<BrandStore>((set) => ({
  currentBrandId: null,
  currentBrand: null,

  setCurrentBrand: (brand: BrandInfo) => {
    set({ currentBrand: brand, currentBrandId: brand.id })
  },

  clearBrand: () => {
    set({ currentBrand: null, currentBrandId: null })
  },
}))