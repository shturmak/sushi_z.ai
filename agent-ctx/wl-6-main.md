---
Task ID: wl-6
Agent: Main
Task: Create public customer-facing storefront at `/`

Work Log:
- Created `src/lib/storefront-mock-data.ts` with brand config (Суші Мастер, #e11d48), 6 categories, 18 products (including 1 unavailable)
- Generated hero banner image via z-ai CLI (`public/hero-sushi.png`, 1344x768)
- Built `src/app/page.tsx` as a full storefront page with:
  - Sticky header with brand name (UtensilsCrossed icon + name) and cart icon with count badge
  - Hero section: full-width sushi photo with brand-color gradient overlay, slogan, CTA button
  - Sticky category pills bar with horizontal scroll (Усе + 6 categories)
  - Responsive products grid (1/2/3/4 cols at breakpoints)
  - Product cards: image placeholder, name, description, price in brand color, weight badge, "Додати" button
  - Unavailable items: grayed out, "Немає в наявності" overlay, no add button
  - Cart Sheet (right drawer): item list with +/- quantity controls, remove button, subtotal/delivery/total, checkout button, empty state
  - Sticky bottom bar when cart has items: item count, total, "Переглянути кошик" button
  - Footer: brand name, copyright, "powered by SushiChain"
  - `min-h-screen flex flex-col` for proper footer sticking
  - Bottom padding spacer when cart bar is visible
- Removed `ReactNode` unused import
- Lint passes cleanly
- Page compiles and returns HTTP 200

Stage Summary:
- 3 files created/modified: `src/lib/storefront-mock-data.ts`, `src/app/page.tsx`, `public/hero-sushi.png`
- Storefront is fully functional with cart state management, category filtering, responsive grid
- All text in Ukrainian
- Brand accent color (#e11d48) used consistently for buttons, prices, badges