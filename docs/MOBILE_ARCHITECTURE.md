# Mobile Architecture — SushiChain White-Label App

## 1. Overview

SushiChain is a **multi-tenant white-label food ordering platform**. Each client (brand) gets their own dedicated mobile applications: **one Android (APK/AAB)** and **one iOS (IPA)**. All brands share the same codebase — only configuration differs between builds.

```
┌─────────────────────────────────────────────────────┐
│                  SushiChain Backend                  │
│              Next.js 16 / Prisma / SQLite            │
├─────────────────────────────────────────────────────┤
│              REST API  ({brand_domain}/api)          │
└──────────┬──────────────┬──────────────┬────────────┘
           │              │              │
    ┌──────▼──────┐ ┌────▼───────┐ ┌────▼───────┐
    │  Brand A    │ │  Brand B   │ │  Brand C   │
    │  Android    │ │  Android   │ │  Android   │
    │  iOS        │ │  iOS       │ │  iOS       │
    └─────────────┘ └────────────┘ └────────────┘
```

**Key principles:**

- **1 client = 1 Android + 1 iOS** app (separate app store listings)
- **Single codebase, multiple flavors** — brand-specific configuration injected at build time via Expo config plugins and environment variables
- **Shared API SDK** — the same TypeScript API client works across all brand builds
- **Over-the-air (OTA) updates** — Expo EAS Update pushes JavaScript changes without app store review

---

## 2. Architecture

The mobile app uses **React Native with Expo** (managed workflow) for cross-platform development.

```
┌─────────────────────────────────────────────────────┐
│                   Expo SDK 50+                       │
├─────────────────────────────────────────────────────┤
│  React Navigation (Stack + Bottom Tabs)             │
├─────────────────────────────────────────────────────┤
│  State Management: Zustand                          │
├──────────┬──────────┬──────────┬────────────────────┤
│ Auth     │ Cart     │ Orders   │ Profile            │
│ Store    │ Store    │ Store    │ Store              │
├──────────┴──────────┴──────────┴────────────────────┤
│  API Client (Axios + JWT interceptors)              │
├─────────────────────────────────────────────────────┤
│  Brand Config (injected at build time)              │
└─────────────────────────────────────────────────────┘
```

### Why Expo?

| Concern | Solution |
|---|---|
| Cross-platform | Single React Native codebase → Android + iOS |
| Build pipeline | EAS Build (cloud builds with custom configs) |
| OTA updates | EAS Update — push JS changes without store review |
| Native modules | Config plugins for splash screen, icons, scheme, etc. |
| Brand flavors | `eas.json` build profiles + `app.config.ts` per-brand logic |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 50+ (React Native) |
| Language | TypeScript 5.x |
| Navigation | React Navigation 6+ (Stack + Bottom Tabs) |
| State | Zustand 4+ |
| HTTP Client | Axios 1.x |
| Forms | React Hook Form + Zod validation |
| UI Kit | Custom components (Tailwind via NativeWind or StyleSheet) |
| Animations | react-native-reanimated |
| Maps | react-native-maps (delivery tracking) |
| Push Notifications | expo-notifications |
| Payments | In-app WebView for LiqPay / Stripe checkout |
| i18n | expo-localization + i18next |
| Storage | AsyncStorage (tokens) + SecureStore (sensitive data) |
| Testing | Jest + React Native Testing Library |

---

## 4. Project Structure

```
mobile-app/
├── app.config.ts                 # Dynamic Expo config (reads brand flavor)
├── eas.json                      # Build profiles per flavor
├── package.json
├── tsconfig.json
├── brands/                       # Brand flavor configurations
│   ├── sushichain.json           # Brand A config
│   ├── pizzatime.json            # Brand B config
│   └── burgerking-kyiv.json      # Brand C config
├── assets/
│   ├── fonts/
│   ├── images/
│   └── brand/                    # Brand-specific assets (icons, splashes)
│       ├── sushichain/
│       ├── pizzatime/
│       └── burgerking-kyiv/
├── src/
│   ├── app/                      # Expo Router (file-based routing)
│   │   ├── _layout.tsx           # Root layout (providers, navigation)
│   │   ├── (auth)/               # Auth group
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (main)/               # Authenticated group
│   │   │   ├── _layout.tsx       # Bottom tab navigator
│   │   │   ├── index.tsx         # Home / Menu
│   │   │   ├── cart.tsx
│   │   │   ├── orders/
│   │   │   ├── profile/
│   │   │   └── favorites.tsx
│   │   ├── branch/
│   │   ├── product/[id].tsx
│   │   ├── checkout.tsx
│   │   ├── order/[id].tsx
│   │   └── payment-result.tsx
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   ├── brand/                # Brand-themed components
│   │   ├── menu/                 # Menu display components
│   │   ├── cart/                 # Cart drawer, item cards
│   │   ├── orders/               # Order cards, status timeline
│   │   └── auth/                 # Login/register forms
│   ├── stores/
│   │   ├── auth.store.ts         # Auth state + token management
│   │   ├── cart.store.ts         # Cart state
│   │   ├── brand.store.ts        # Brand config + theme
│   │   └── order.store.ts        # Order tracking
│   ├── api/
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── auth.ts               # Login, register, refresh, logout
│   │   ├── brands.ts             # Get brands
│   │   ├── branches.ts           # Branches + delivery zones
│   │   ├── menu.ts               # Menu categories + products
│   │   ├── cart.ts               # Cart CRUD
│   │   ├── orders.ts             # Order CRUD + cancel + repeat
│   │   ├── payments.ts           # Payment intent
│   │   ├── promotions.ts         # List + validate promotions
│   │   ├── loyalty.ts            # Loyalty account + transactions
│   │   ├── favorites.ts          # Favorite products
│   │   ├── addresses.ts          # User addresses
│   │   ├── profile.ts            # Get/update profile
│   │   ├── reviews.ts            # Product reviews
│   │   ├── search.ts             # Product search
│   │   └── feedback.ts           # Support feedback
│   ├── types/
│   │   └── api.ts                # TypeScript types (see docs/mobile-sdk-types.ts)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   ├── useBranch.ts
│   │   └── useOrders.ts
│   ├── lib/
│   │   ├── brand-config.ts       # Runtime brand config loader
│   │   ├── storage.ts            # Secure storage helpers
│   │   ├── i18n.ts               # Internationalization setup
│   │   └── theme.ts              # Dynamic theming from brand config
│   └── constants/
│       └── index.ts              # App-wide constants
├── tests/
│   ├── api/
│   ├── components/
│   └── stores/
└── scripts/
    ├── build-brand.sh            # Build a specific brand flavor
    └── generate-icons.ts         # Generate app icons per brand
```

---

## 5. API Client SDK

The API client is a thin Axios wrapper with JWT interceptors. It uses the TypeScript types defined in `docs/mobile-sdk-types.ts`.

### Client Setup

```typescript
// src/api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../lib/brand-config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL, // e.g. "https://sushichain.example.com/api"
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          await AsyncStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
          // Navigate to login
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### Usage Example

```typescript
import { apiClient } from './client';
import type { LoginRequest, AuthResponse } from '../types/api';

export async function login(params: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<{ success: true; data: AuthResponse }>('/auth/login', params);
  return data.data;
}
```

---

## 6. Brand Flavors

Each brand is defined by a JSON configuration file in `brands/`.

### Brand Configuration Schema

```typescript
// brands/sushichain.json
{
  "brandId": "clx_abc123...",
  "brandSlug": "sushichain",
  "brandName": "SushiChain",
  "brandDomain": "sushichain.example.com",
  "apiBaseUrl": "https://sushichain.example.com/api",

  "android": {
    "applicationId": "com.sushichain.app",
    "packageName": "com.sushichain.app",
    "name": "SushiChain",
    "icon": "./assets/brand/sushichain/icon.png",
    "splash": "./assets/brand/sushichain/splash.png",
    "adaptiveIcon": "./assets/brand/sushichain/adaptive-icon.png",
    "scheme": "sushichain",
    "sha256": "< signing certificate fingerprint >"
  },

  "ios": {
    "bundleIdentifier": "com.sushichain.app",
    "name": "SushiChain",
    "icon": "./assets/brand/sushichain/icon.png",
    "splash": "./assets/brand/sushichain/splash.png",
    "scheme": "sushichain"
  },

  "theme": {
    "primaryColor": "#e11d48",
    "secondaryColor": "#f97316",
    "accentColor": "#0ea5e9",
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "fontFamily": "Inter"
  },

  "currency": "UAH",
  "currencySymbol": "\u20b4",
  "language": "uk",
  "enableLoyalty": true,
  "enableDelivery": true,
  "enablePickup": true,
  "enableScheduledOrders": true
}
```

### Runtime Brand Config Injection

The brand config is embedded at build time via Expo's `app.config.ts`:

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const brand = require(`./brands/${process.env.BRAND_FLAVOR || 'sushichain'}.json`);

  return {
    name: brand.brandName,
    slug: brand.brandSlug,
    ...brand.android,
    ...brand.ios,
    extra: {
      brandId: brand.brandId,
      apiBaseUrl: brand.apiBaseUrl,
      theme: brand.theme,
      currency: brand.currency,
      currencySymbol: brand.currencySymbol,
      enableLoyalty: brand.enableLoyalty,
      enableDelivery: brand.enableDelivery,
      enablePickup: brand.enablePickup,
      enableScheduledOrders: brand.enableScheduledOrders,
    },
    plugins: [
      'expo-router',
      'expo-localization',
      [
        'expo-splash-screen',
        { backgroundColor: brand.theme.primaryColor, image: brand.android.splash },
      ],
    ],
  };
};
```

---

## 7. Build Process

### EAS Build Configuration

```json
// eas.json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "sushichain-android": {
      "env": { "BRAND_FLAVOR": "sushichain" },
      "android": { "gradleCommand": ":app:assembleSushichainRelease" }
    },
    "sushichain-ios": {
      "env": { "BRAND_FLAVOR": "sushichain" },
      "ios": { "scheme": "sushichain" }
    },
    "pizzatime-android": {
      "env": { "BRAND_FLAVOR": "pizzatime" },
      "android": { "gradleCommand": ":app:assemblePizzatimeRelease" }
    },
    "pizzatime-ios": {
      "env": { "BRAND_FLAVOR": "pizzatime" },
      "ios": { "scheme": "pizzatime" }
    }
  }
}
```

### Build Commands

```bash
# Build Android APK for a specific brand
BRAND_FLAVOR=sushichain eas build --profile sushichain-android --platform android

# Build iOS for a specific brand
BRAND_FLAVOR=sushichain eas build --profile sushichain-ios --platform ios

# Build all brands (script)
for brand in sushichain pizzatime; do
  eas build --profile ${brand}-android --platform android
  eas build --profile ${brand}-ios --platform ios
done
```

### OTA Update

```bash
# Publish an over-the-air update for a specific brand
eas update --branch sushichain-production --message "Fix: cart total calculation"
```

---

## 8. State Management (Zustand)

```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, LoyaltySummary } from '../types/api';

interface AuthState {
  user: User | null;
  loyalty: LoyaltySummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, loyalty: LoyaltySummary, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loyalty: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, loyalty, accessToken, refreshToken) =>
        set({ user, loyalty, accessToken, refreshToken, isAuthenticated: true }),

      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : null })),

      logout: () =>
        set({ user: null, loyalty: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

---

## 9. Navigation Structure

```
App
├── (auth)
│   ├── Login
│   └── Register
├── (main) — Bottom Tabs
│   ├── Home (Menu)
│   │   ├── ProductDetail
│   │   └── ProductReviews
│   ├── Search
│   ├── Cart → Checkout
│   │   ├── AddressPicker
│   │   ├── PaymentMethod
│   │   └── PaymentResult
│   ├── Orders
│   │   └── OrderDetail
│   ├── Favorites
│   └── Profile
│       ├── EditProfile
│       ├── MyAddresses
│       ├── Loyalty
│       └── Settings
└── BranchPicker (modal)
```

---

## 10. Security Considerations

- **JWT tokens** stored in `AsyncStorage`; refresh tokens can be migrated to `SecureStore` for added protection
- **SSL pinning** via `expo-ssl-pinning` to prevent MITM attacks
- **Rate limiting** headers respected on client side (`X-RateLimit-Remaining`, `Retry-After`)
- **No sensitive data** in `expo-constants` `extra` field (only brand config)
- **Biometric lock** optional via `expo-local-authentication` for payment confirmation