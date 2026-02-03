# Spot (GoldApp) – Architecture & Long-Term Maintenance

## 1. Architecture Overview

### 1.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USERS / DEVICES                                    │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│   iOS App       │   Web (PWA)      │   iOS Widget    │   Admin (web)        │
│   (Spot)        │   (Vercel)       │   (Home screen) │   /admin             │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬───────────┘
         │                 │                 │                    │
         │    Supabase     │    Supabase     │  App Group +       │  Supabase
         │    (anon key)   │    (anon key)   │  SharedGroupPrefs   │  (anon key)
         ▼                 ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                                   │
│  • PostgreSQL DB                                                            │
│  • Tables: market_prices, historical_prices, web_push_subscriptions, ...     │
│  • Edge Functions: send-price-update-notification, send-web-push-reminder   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │  Build / Deploy
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  • iOS: EAS Build (Expo) → App Store Connect / TestFlight                    │
│  • Web: Expo export → Vercel (static + rewrites + service worker)            │
│  • Git: GitHub (source of truth for EAS and Vercel)                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo (React Native) 54, React 19, React Native 0.81 |
| **Routing** | expo-router (file-based: `app/`, `app/(admin)/`) |
| **Backend / DB** | Supabase (PostgreSQL, Edge Functions, Auth optional) |
| **iOS native** | Xcode project in `ios/`, CocoaPods, Swift widget in `targets/widget/` |
| **Web deploy** | Vercel (`npm run build:web` → `dist/`, rewrites for SPA) |
| **iOS build & submit** | EAS Build + EAS Submit (Expo Application Services) |
| **Source control** | Git (GitHub); EAS and Vercel use repo for builds |

### 1.3 Data Flow

- **Prices**
  - **market_prices**: current/latest gold & silver prices (per gram/base). App and widget read from here.
  - **historical_prices**: time-series for charts. App fetches via Supabase client; fallback to static `data/historical-prices.ts` if table missing or error.
- **Widget (iOS)**
  - Main app and widget extension share **App Group** `group.com.rahulboggaram.Spot.goldapp`.
  - App writes latest prices into **SharedGroupPreferences** (and ExtensionStorage) after fetching from Supabase; **Background App Refresh** task `widget-price-refresh` runs when app is in background (not when force-quit).
  - Widget (`targets/widget/index.swift`) reads from App Group and displays gold/silver.
- **Web**
  - Same Supabase client (`lib/supabase.js`); anon key in code. Web can use same `market_prices` / `historical_prices` and optional auth later.
- **Push / notifications**
  - **expo-notifications** for iOS; Supabase Edge Functions for sending (e.g. price update, web push reminder). Web push uses `web_push_subscriptions` and service worker `public/sw.js`.

### 1.4 Key Directories

| Path | Purpose |
|------|---------|
| `app/` | App routes: `index.tsx` (main screen), `price-history.tsx`, `(admin)/` (admin + widget-preview) |
| `components/` | Reusable UI (e.g. metal-price-card, simple-line-chart, historical-prices-sheet) |
| `lib/` | `supabase.js` (client), `widget-background-update.ts` (fetch prices + update widget) |
| `data/` | Static fallback `historical-prices.ts` |
| `constants/` | `theme.ts` |
| `hooks/`, `utils/` | Shared hooks and helpers |
| `assets/` | Fonts, images, icons |
| `ios/` | Native iOS project (Spot app + Pods); do not commit `Pods/`, `build/` |
| `targets/widget/` | iOS widget extension (Swift): `index.swift`, entitlements, assets |
| `supabase/` | Edge Functions and migrations |
| `scripts/` | DB/price helpers (e.g. update-database-prices, import-historical-prices) |
| `public/` | Web: `sw.js` (service worker) |

### 1.5 Configuration Files

| File | Purpose |
|------|---------|
| `app.json` | Expo app name, slug, version, **iOS** (bundleId, buildNumber, teamId, entitlements), **web** (PWA/metro), **plugins** (apple-targets, expo-build-properties, notifications) |
| `eas.json` | EAS Build profiles (development, preview, **production** with autoIncrement, cache), EAS Submit |
| `vercel.json` | Vercel: buildCommand, outputDirectory `dist`, rewrites for SPA, headers for `sw.js` |
| `package.json` | Scripts: `start`, `web`, `build:web`, `ios`, `android`; dependencies (Expo, Supabase, navigation, etc.) |
| `ios/Podfile`, `ios/Podfile.properties.json` | CocoaPods; `apple.ccacheEnabled: false` for EAS |

---

## 2. What You Need to Maintain Long-Term

### 2.1 Dependencies & Security

- **npm**
  - Periodically: `npm audit` and fix high/critical; update deps (e.g. `npm update` or bump versions in `package.json`).
  - Before major Expo upgrades, check [Expo SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo/) and React Native compatibility.
- **iOS**
  - After pulling or changing native deps: `cd ios && pod install` (and fix any Xcode/project issues).
  - Keep **Apple Developer** account and **App Store Connect API Key** valid; renew certs/profiles as needed.
- **Supabase**
  - Keep project active; rotate anon (and any secret) keys if leaked; apply DB migrations from `supabase/migrations/` when you add/change tables.

### 2.2 Environment & Secrets

- **Supabase** URL and anon key are in `lib/supabase.js`. For production, consider env vars (e.g. `EXPO_PUBLIC_SUPABASE_URL`) and never commit secret keys.
- **Vercel**: use Vercel env vars for any web-only secrets.
- **EAS**: credentials (Apple API Key, certs) are stored in EAS; use `eas credentials` to manage. Don’t commit `.p8` or credentials.

### 2.3 Database (Supabase)

- **Tables used by app**: `market_prices`, `historical_prices`; push: `web_push_subscriptions` (and any other from Edge Functions).
- **Scripts**: `scripts/update-database-prices.js`, `scripts/import-historical-prices.js`, etc. Run when you need to backfill or fix data; keep schema in sync with migrations.
- **Migrations**: Add new migrations under `supabase/migrations/` and apply via Supabase CLI or dashboard.

### 2.4 Versioning & Releases

- **app.json**
  - **version**: user-facing (e.g. `1.0.0`); bump for store listing.
  - **ios.buildNumber**: must increase for each new iOS build uploaded to App Store Connect; EAS can auto-increment (`eas.json` production) but you can set it explicitly (e.g. `"2"`, `"3"`) to avoid “already submitted” errors.
- **Web**: Usually no separate version file; Vercel deploys on push (or from same branch you use for EAS).

### 2.5 iOS-Specific

- **Widget**: If you change App Group ID or bundle IDs, update: `app.json` (entitlements), `targets/widget/generated.entitlements`, `ios/Spot/Spot.entitlements`, widget code (`APP_GROUP` in `lib/widget-background-update.ts` and in `targets/widget/index.swift`).
- **Xcode**: If you change native code or add pods, run `pod install` and fix any module/script errors (e.g. ccache, objectVersion) as needed.
- **EAS**: Use same Apple Team ID and bundle IDs across app and widget; keep API Key active for submissions.

### 2.6 Web / Vercel

- **Build**: `npm run build:web` must succeed; output is `dist/` (see `vercel.json`).
- **Service worker**: `public/sw.js` is served at `/sw.js`; if you change cache or push logic, redeploy and test.
- **Routing**: All routes rewrite to `/index.html` (SPA); admin lives under `app/(admin)/` and is part of the same export.

### 2.7 Regular Maintenance Checklist

| Task | Frequency | Notes |
|------|-----------|--------|
| Update npm dependencies | Quarterly / after security advisories | `npm audit`, `npm update` or targeted bumps |
| Bump iOS buildNumber (or rely on EAS autoIncrement) | Every new App Store / TestFlight build | In `app.json` if manual |
| Renew / check Apple certs & API Key | Yearly or when expired | App Store Connect, EAS credentials |
| Supabase: check usage, backups, migrations | Quarterly | Apply new migrations; keep RLS policies in mind |
| Test main flows (prices, widget, web) | After any Supabase or app change | iOS device + simulator, web browser |
| Clean up old EAS builds / Vercel deploys | Occasionally | To avoid clutter and stay under limits |

### 2.8 If Something Breaks

- **“Red screen” / fetch errors in app**: Check Supabase tables (`market_prices`, `historical_prices`) and RLS; ensure `lib/supabase.js` URL/key are correct; see `fetchHistoricalPrices` and widget update logic in `app/index.tsx` and `lib/widget-background-update.ts`.
- **Widget not updating**: Confirm App Group ID is same everywhere; Background App Refresh enabled; app not force-quit; SharedGroupPreferences and ExtensionStorage used after fetch.
- **EAS build fails**: Check EAS build logs; common issues: credentials (API Key inactive), buildNumber already submitted, or CocoaPods/Xcode (e.g. ccache, objectVersion) — fix in `ios/` or `Podfile.properties.json` / `project.pbxproj` as done before.
- **Web build fails**: Run `npm run build:web` locally; fix any missing env or broken imports; ensure `vercel.json` matches Expo web output.

---

## 3. One-Page Summary

- **Architecture**: One Expo (React Native) codebase for **iOS app**, **web (PWA)**, and **admin**. **Supabase** is the backend (DB + Edge Functions). **iOS widget** reads from App Group; app updates it from Supabase via Background App Refresh.
- **Deploy**: **iOS** → EAS Build + EAS Submit (App Store Connect). **Web** → `npm run build:web` → Vercel (`dist/`, SPA rewrites, `sw.js`).
- **Maintain**: Keep deps and Supabase secure; bump **iOS buildNumber** (or use EAS autoIncrement) for each new build; keep Apple credentials and API Key valid; run DB scripts/migrations when needed; test app, widget, and web after big changes.

Use this doc as the single reference for architecture and long-term maintenance of Spot (GoldApp).
