# Mobile Publishing Guide — SushiChain

Step-by-step guide for publishing SushiChain white-label apps to Google Play and the App Store.

---

## 1. Google Play Publishing

### 1.1 Create a Google Play Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with a Google account
3. Pay the **$25 USD one-time registration fee**
4. Complete the developer profile (name, address, contact)
5. Account verification takes 1–2 business days

**Important for white-label:** You can publish all brand apps under a single developer account, or create separate accounts per client. Using a single account simplifies billing but may require permission management.

### 1.2 Generate a Signed Keystore

Each brand flavor needs its own keystore (or a single keystore with different key aliases).

```bash
# Generate a new keystore for a brand
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore keystores/sushichain.keystore \
  -alias sushichain \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass STRONG_STORE_PASSWORD \
  -keypass STRONG_KEY_PASSWORD
```

**Store the keystore securely:**
- Never commit keystores to version control
- Use a secrets manager (e.g., EAS Secrets, AWS Secrets Manager, 1Password)
- Back up keystores in at least two secure locations
- Record the passwords and alias names

### 1.3 Configure Build Variants (Flavors)

In Expo, flavors are managed through `eas.json` build profiles and native configuration plugins.

**`eas.json` example:**
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "sushichain-preview": {
      "distribution": "internal",
      "env": { "BRAND_FLAVOR": "sushichain" },
      "android": {
        "gradleCommand": ":app:assembleSushichainDebug"
      }
    },
    "sushichain-production": {
      "distribution": "store",
      "env": { "BRAND_FLAVOR": "sushichain" },
      "android": {
        "gradleCommand": ":app:assembleSushichainRelease",
        "keystore": "sushichain"
      }
    },
    "pizzatime-production": {
      "distribution": "store",
      "env": { "BRAND_FLAVOR": "pizzatime" },
      "android": {
        "gradleCommand": ":app:assemblePizzatimeRelease",
        "keystore": "pizzatime"
      }
    }
  }
}
```

**Register keystores with EAS:**
```bash
eas credentials
# Select "Set up Android Keystore"
# Enter keystore path, alias, and passwords
# EAS will store these securely
```

### 1.4 Build the App

```bash
# Production build for Google Play
eas build --profile sushichain-production --platform android

# Preview / internal testing build
eas build --profile sushichain-preview --platform android
```

The build produces an **Android App Bundle (.aab)** — Google Play's preferred format.

### 1.5 Prepare Store Listing

For each brand, prepare the following assets:

| Asset | Spec |
|---|---|
| App Icon | 512 x 512 PNG, 32-bit color |
| Feature Graphic | 1024 x 500 PNG |
| Phone Screenshots | Minimum 2, max 8. 1080 x 1920 or 1080 x 2400 |
| Tablet Screenshots (optional) | 2024 x 3000 |
| App Description | Short (80 chars) + Full (4000 chars) |
| Category | Food & Drink |
| Content Rating | Complete the content rating questionnaire |
| Privacy Policy URL | Required — host a brand-specific privacy policy |
| Data Safety | Declare data collection practices |
| Target API Level | Must target API 31+ (Android 12+) |

**Description template:**
```
[Brand Name] — Order food for delivery or pickup

Browse our menu, customize your order, and get it delivered
to your door. Track your order in real-time, earn loyalty
points, and enjoy exclusive promotions.

Features:
• Fast delivery and easy pickup
• Real-time order tracking
• Loyalty rewards program
• Secure online payments
• Save your favorite items
• Schedule orders in advance
```

### 1.6 Submit for Review

1. Open [Google Play Console](https://play.google.com/console)
2. Select **All Apps** → **Create App**
3. Fill in app details (name, language, free/paid, content rating)
4. Go to **Store Settings** → upload icon, screenshots, descriptions
5. Go to **Release** → **Production** → **Create New Release**
6. Upload the `.aab` file from the EAS build
7. Enter **release notes**
8. Click **Review Release** → **Start Rollout to Production**

**Review time:** Typically 1–7 business days for the first submission, 1–3 days for updates.

### 1.7 Update an Existing App

```bash
# Increment version in app.config.ts or package.json
# Then build
eas build --profile sushichain-production --platform android

# Or push an OTA update (no review needed for JS-only changes)
eas update --branch sushichain-production --message "Fix: cart total"
```

For native changes (new permissions, config plugins), you must submit a new `.aab` to Google Play. For JavaScript-only changes, use **EAS Update** (OTA).

---

## 2. App Store Publishing

### 2.1 Create an Apple Developer Account

1. Go to [Apple Developer Program](https://developer.apple.com/programs/)
2. Click **Enroll** and sign in with an Apple ID
3. Pay the **$99 USD annual** membership fee
4. Complete the enrollment form (legal entity information)

**Important for white-label:** Each client may want their own developer account for full control. Coordinate with clients early on Apple Developer account ownership.

### 2.2 Generate Certificates and Provisioning Profiles

Using EAS Build, certificate management is mostly automated:

```bash
# Let EAS manage your Apple certificates
eas credentials
# Select "Set up Apple Provisioning Profile"
# EAS generates certificates and profiles automatically
```

**Manual setup (if needed):**

1. In [Apple Developer Portal](https://developer.apple.com/account), go to **Certificates, Identifiers & Profiles**
2. Create an **App ID**:
   - Bundle Identifier: `com.sushichain.app`
   - Capabilities: Push Notifications, In-App Purchase (if applicable)
3. Create a **Distribution Certificate**:
   - Type: Apple Distribution
   - Download and install in Keychain
4. Create a **Provisioning Profile**:
   - Type: App Store Distribution
   - Select the App ID and Distribution Certificate

### 2.3 Configure Targets

In the Expo managed workflow, targets are configured through `app.config.ts`:

```typescript
export default ({ config }: ConfigContext): ExpoConfig => {
  const brand = require(`./brands/${process.env.BRAND_FLAVOR}.json`);

  return {
    name: brand.ios.name,
    slug: brand.brandSlug,
    ios: {
      bundleIdentifier: brand.ios.bundleIdentifier,
      supportsTablet: true,
      buildNumber: "1",
      infoPlist: {
        CFBundleURLSchemes: [brand.ios.scheme],
        LSApplicationQueriesSchemes: ["liqpay"],
      },
    },
    // ...
  };
};
```

### 2.4 Build the App

```bash
# Production build for App Store
eas build --profile sushichain-production --platform ios

# This produces an .ipa file, or if using EAS Submit, uploads directly
```

### 2.5 Prepare App Store Listing

| Asset | Spec |
|---|---|
| App Icon | 1024 x 1024 PNG (no alpha) |
| Screenshots (iPhone) | 6.7" (1290 x 2796), 6.5" (1284 x 2778), 5.5" (1242 x 2208) |
| Screenshots (iPad) | 12.9" (2048 x 2732) |
| App Description | 4000 characters max |
| Keywords | 100 characters, comma-separated |
| Category | Food & Drink |
| Age Rating | Complete the content rating questionnaire |
| Privacy Policy URL | Required |
| App Privacy (Nutrition Labels) | Required — declare all data collection |
| Support URL | Required |
| Marketing URL | Optional |
| Copyright | © 2025 Brand Name |

**Screenshots by device:**
- iPhone 15 Pro Max: 1290 x 2796 px
- iPhone 8 Plus: 1242 x 2208 px
- iPad Pro 12.9": 2048 x 2732 px

### 2.6 Submit for Review

**Via EAS Submit (recommended):**
```bash
eas submit --platform ios --profile sushichain-production
```

**Via App Store Connect manually:**
1. Open [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **My Apps** → **+** → **New App**
3. Enter name, primary language, bundle ID, SKU
4. Fill in all required metadata
5. Go to **App Store** tab → upload screenshots, descriptions, keywords
6. Select **iOS App** → **Prepare for Submission**
7. Select the build from EAS (appears after ~15 minutes)
8. Complete the **App Privacy** (Nutrition Labels) questionnaire
9. Click **Submit for Review**

**Review time:** Typically 1–3 business days. Can be faster or slower depending on the review queue.

### 2.7 Common Rejection Reasons and Fixes

| Rejection | Fix |
|---|---|
| Missing App Privacy labels | Complete all nutrition label questions honestly |
| Guideline 2.1 (App Completeness) | Ensure all features work; test on a real device |
| Guideline 4.2 (Minimum Functionality) | App must provide lasting entertainment or utility |
| Guideline 5.1.1 (Data Collection) | Declare all data collection, even analytics |
| Missing push notification permission reason | Add `NSUserNotificationsUsageDescription` to Info.plist |
| Crash on launch | Test thoroughly on multiple devices and iOS versions |

---

## 3. White-Label Process: Creating a New Brand Build

### Step-by-Step Workflow

```
1. Create brand config    →  brands/newbrand.json
2. Create brand assets    →  assets/brand/newbrand/
3. Build Android          →  eas build --profile newbrand-production --platform android
4. Build iOS              →  eas build --profile newbrand-production --platform ios
5. Set up store listings  →  Google Play Console + App Store Connect
6. Submit for review      →  eas submit or manual upload
7. Deploy backend         →  Create brand in admin panel, add domain
8. OTA updates going      →  eas update --branch newbrand-production
```

### Detailed Steps

#### 3.1 Create Brand Configuration

Copy an existing brand config and customize:

```bash
cp brands/sushichain.json brands/newbrand.json
```

Edit `brands/newbrand.json`:
- Set unique `brandId`, `brandSlug`, `brandName`
- Set `brandDomain` and `apiBaseUrl`
- Set Android `applicationId` and iOS `bundleIdentifier`
- Set `theme` colors
- Set `currency`, `currencySymbol`, `language`

#### 3.2 Create Brand Assets

Prepare the following assets:
- **App Icon** — 1024x1024 PNG (will be resized for all platforms)
- **Adaptive Icon** (Android) — foreground and background layers
- **Splash Screen** — background color + centered logo

```bash
mkdir -p assets/brand/newbrand/
# Place icon.png, adaptive-icon.png, splash.png
```

#### 3.3 Add Build Profile to `eas.json`

```json
{
  "build": {
    "newbrand-preview": {
      "distribution": "internal",
      "env": { "BRAND_FLAVOR": "newbrand" }
    },
    "newbrand-production": {
      "distribution": "store",
      "env": { "BRAND_FLAVOR": "newbrand" },
      "android": { "keystore": "newbrand" },
      "ios": {}
    }
  }
}
```

#### 3.4 Build and Submit

```bash
# Preview build for testing
eas build --profile newbrand-preview --platform android
eas build --profile newbrand-preview --platform ios

# Production builds
eas build --profile newbrand-production --platform android
eas build --profile newbrand-production --platform ios

# Submit to stores
eas submit --platform android --profile newbrand-production
eas submit --platform ios --profile newbrand-production
```

#### 3.5 Backend Setup

In the SushiChain admin panel:
1. Create the new **Brand** with all details (name, slug, colors, domain)
2. Create **Branches** for the brand
3. Set up **Delivery Zones** for each branch
4. Create **Categories** and **Products**
5. Configure **Brand Settings** (loyalty rate, features enabled)
6. Set up the **domain** with Caddy/nginx reverse proxy

---

## 4. OTA Updates with Expo

### How It Works

Expo EAS Update allows you to push JavaScript bundle updates to users without going through app store review. This includes:

- Bug fixes
- UI changes
- New features (that don't require new native modules)
- Content changes

**OTA updates CANNOT include:**
- New native dependencies
- Changes to app permissions
- New app icons or splash screens
- Changes to `app.config.ts` that affect native code

### Update Channels

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Development    │────▶│   Preview/QA     │────▶│   Production    │
│  eas update      │     │  eas update      │     │  eas update      │
│  --branch dev    │     │  --branch preview │     │  --branch prod   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Publishing an Update

```bash
# Publish to production for a specific brand
eas update --branch sushichain-production --message "Fix: cart total calculation"

# Publish to preview for testing
eas update --branch sushichain-preview --message "New: loyalty tier badge"

# Publish to all brands
for brand in sushichain pizzatime; do
  eas update --branch ${brand}-production --message "Fix: login screen crash"
done
```

### Rollback

```bash
# List recent updates
eas update:list --branch sushichain-production

# Rollback to a previous update
eas update:rollback --branch sushichain-production --runtime-version <version>
```

### Best Practices

1. **Always test on preview first** — publish to the preview branch, test on real devices, then promote
2. **Use message strings** — descriptive messages help track what each update contains
3. **Monitor update adoption** — use Expo's built-in analytics or your own to see how quickly users are getting updates
4. **Keep runtime versions compatible** — if a native change is needed, bump the runtime version and submit a new binary
5. **Gradual rollouts** — use Expo's `channel` feature to roll out to a percentage of users first

---

## 5. Pre-Submission Checklist

Use this checklist before submitting any brand build to the app stores.

### General

- [ ] Brand config (`brands/*.json`) is complete and correct
- [ ] `apiBaseUrl` points to the correct production domain
- [ ] `brandId` matches the backend brand record
- [ ] App icon follows platform guidelines (no text, no transparency)
- [ ] Splash screen uses brand primary color
- [ ] All screens tested on physical devices (not just simulators)
- [ ] No placeholder content (Lorem ipsum, default images)
- [ ] No debug logging in production builds
- [ ] No hardcoded test credentials

### Android (Google Play)

- [ ] Keystore generated and securely stored
- [ ] `applicationId` is unique across all brands
- [ ] `minSdkVersion` is at least 21 (Android 5.0)
- [ ] `targetSdkVersion` is at least 34 (Android 14)
- [ ] ProGuard/R8 is enabled for release builds
- [ ] Android App Bundle (.aab) is used (not APK)
- [ ] Store listing complete (icon, screenshots, description, category)
- [ ] Content rating questionnaire completed
- [ ] Data safety section filled out
- [ ] Privacy policy URL is accessible
- [ ] Tested on at least 3 different Android devices
- [ ] Deep links work (`{scheme}://...`)

### iOS (App Store)

- [ ] Apple Developer account is active ($99/year paid)
- [ ] Bundle Identifier is unique across all brands
- [ ] Distribution certificate and provisioning profile are valid
- [ ] `Info.plist` includes all required permission descriptions
- [ ] Push notification capability is enabled (if used)
- [ ] App Transport Security is configured (no HTTP in production)
- [ ] App follows Human Interface Guidelines
- [ ] Screenshots for all required device sizes
- [ ] App Store description, keywords, and category are set
- [ ] App Privacy (Nutrition Labels) completed
- [ ] Privacy policy and support URLs are accessible
- [ ] Tested on iPhone and iPad (if supporting iPad)
- [ ] No private API usage

### Backend / API

- [ ] Brand domain is configured and pointing to the server
- [ ] SSL certificate is valid (HTTPS)
- [ ] API is accessible at `{domain}/api`
- [ ] All API endpoints respond correctly for the brand
- [ ] Rate limiting is properly configured
- [ ] Payment provider is configured and tested
- [ ] Push notifications are working (if applicable)
- [ ] Error monitoring is set up (Sentry, etc.)

### Post-Launch

- [ ] Monitor crash reports (Sentry / Expo crash reports)
- [ ] Monitor API error rates
- [ ] Set up alerts for 5xx errors
- [ ] Monitor app store reviews
- [ ] Verify OTA updates are being delivered
- [ ] Set up analytics events for key user flows