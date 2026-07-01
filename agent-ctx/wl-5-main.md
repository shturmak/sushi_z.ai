# Task wl-5 — Brand Selector, Brands Page, Sidebar Update

## Files Created
1. **`src/lib/brand-store.ts`** — Zustand store with `currentBrandId`, `currentBrand`, `setCurrentBrand`, `clearBrand`
2. **`src/app/admin/brands/page.tsx`** — Full CRUD brands page with table, create/edit dialog (color pickers, slug auto-gen), delete confirmation

## Files Modified
3. **`src/lib/admin-types.ts`** — Added `Brand` and `BrandFormData` interfaces
4. **`src/lib/admin-mock-data.ts`** — Added `mockBrands` array (2 brands: Суші Мастер, Суши Токіо)
5. **`src/lib/admin-mock-resolver.ts`** — Added `/api/admin/brands` CRUD mock resolver (GET list, GET by id, POST, PUT, DELETE)
6. **`src/components/admin/admin-header.tsx`** — Added Brand Selector dropdown (visible for super_admin), shows color swatch + brand name, "Усі бренди" option to clear selection
7. **`src/components/admin/admin-sidebar.tsx`** — Added "Бренди" nav item with `Building2` icon after Analytics
8. **`src/components/admin/admin-mobile-sidebar.tsx`** — Same nav item added to mobile sidebar

## Design Decisions
- `USE_MOCK = true` kept as-is in `admin-api.ts`
- Brand Selector in header is gated by `role === 'super_admin'` (hardcoded for now; will come from auth context later)
- Brands page table shows: Name, Slug (hidden on small screens), 3 color swatches (primary/secondary/accent), branch count, status badge, edit/delete actions
- Color picker uses native `<input type="color">` alongside a hex text input for precise values
- Form dialog includes a live color preview with a sample styled button
- Slug auto-generates from name on create (Cyrillic-aware slugify)
- All text in Ukrainian per project conventions
- Lint passes cleanly with no errors