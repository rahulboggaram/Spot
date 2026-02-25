# Architecture Overview

This document provides a comprehensive understanding of the Spot (GoldApp) codebase architecture.

## 1. Project Structure

```
GoldApp/
├── app/                    # App routes (expo-router, file-based)
│   ├── index.tsx           # Main screen (gold/silver prices, widget update)
│   ├── price-history.tsx   # Price history with charts
│   ├── support.tsx         # Support/Contact page (web)
│   ├── privacy.tsx         # Privacy Policy page (web)
│   ├── modal.tsx           # Modal screen
│   ├── _layout.tsx         # Root layout (fonts, navigation stack)
│   └── (admin)/            # Admin group
│       ├── _layout.tsx     # Admin layout
│       ├── admin.tsx       # Admin: update prices, test notifications
│       └── widget-preview.tsx  # Widget preview
├── components/             # Reusable UI components
│   ├── metal-price-card.tsx    # Gold/Silver price card
│   ├── simple-line-chart.tsx   # Chart component
│   ├── historical-prices-sheet.tsx
│   ├── widget-preview.tsx
│   ├── inter-font-features.tsx
│   └── ui/                 # Base UI components
├── lib/                    # Core libraries
│   ├── supabase.js         # Supabase client (URL + anon key)
│   └── widget-background-update.ts  # Fetch prices + update iOS widget
├── data/                   # Static fallback data
│   └── historical-prices.ts
├── constants/              # App constants
│   └── theme.ts
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
│   └── font-features.ts
├── assets/                 # Fonts (Inter), images, icons
├── ios/                    # Native iOS project (Xcode, CocoaPods)
│   ├── Spot/               # Main app target
│   └── Spot.xcodeproj/
├── targets/widget/         # iOS widget extension (Swift)
│   ├── index.swift         # Widget UI and data reading
│   ├── generated.entitlements
│   └── Assets.xcassets/
├── supabase/               # Supabase Edge Functions and migrations
│   ├── functions/
│   │   ├── send-price-update-notification/  # iOS push when prices update
│   │   └── send-web-push-reminder/          # PWA push at 12:05pm/5:05pm
│   └── migrations/
├── scripts/                # DB and price helper scripts
├── public/                 # Web: service worker (sw.js)
├── app.json                # Expo config (iOS, Android, Web, plugins)
├── eas.json                # EAS Build/Submit profiles
├── vercel.json             # Vercel deployment config
├── package.json            # Dependencies and scripts
├── APP_STORE_CONTENT.md    # App Store listing content
└── ARCHITECTURE.md         # This document
```

## 2. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USERS / DEVICES                              │
├────────────┬──────────────┬──────────────┬─────────────────────────┤
│  iOS App   │  iOS Widget  │  PWA Admin   │  Web (Consumer)          │
│  (Spot)    │  (Home       │  (iPhone     │  (Vercel)                │
│            │   Screen)    │   Home       │                          │
│            │              │   Screen)    │                          │
└─────┬──────┴──────┬───────┴──────┬───────┴────────┬────────────────┘
      │             │              │                │
      │ Supabase    │ App Group    │ Supabase       │ Supabase
      │ + Push      │ + Shared     │ + Web Push     │
      ▼             ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Backend)                             │
│  PostgreSQL:                                                         │
│    • market_prices          (current gold/silver rates)              │
│    • device_tokens          (iOS Expo push tokens)                   │
│    • web_push_subscriptions (PWA push endpoints)                     │
│    • historical_prices      (optional, price history)                │
│                                                                      │
│  Edge Functions:                                                     │
│    • send-price-update-notification  (iOS push via Expo Push API)   │
│    • send-web-push-reminder          (Web Push via npm:web-push)    │
└─────────────────────────────────────────────────────────────────────┘
      │                                          ▲
      │  Build / Deploy                          │ Cron (12:05pm/5:05pm)
      ▼                                          │
┌──────────────────────────┐    ┌────────────────────────────────────┐
│  iOS: EAS Build → App    │    │  cron-job.org                       │
│       Store / TestFlight │    │  → calls send-web-push-reminder    │
│  Web: Expo export →      │    │  Mon–Fri at 12:05pm & 5:05pm IST  │
│       Vercel (dist/)     │    └────────────────────────────────────┘
│  Git: GitHub (main)      │
└──────────────────────────┘
```

## 3. Core Components

### 3.1. iOS App (Consumer)

**Description:** Main app for viewing live gold and silver prices (Physical and PCX), price history charts, and home screen widget.

**Technologies:** Expo (React Native) 54, React 19, TypeScript, expo-router, expo-notifications

**Key files:** `app/index.tsx`, `app/price-history.tsx`

**Deployment:** EAS Build → App Store Connect / TestFlight

### 3.2. iOS Widget

**Description:** Home screen widget showing gold and silver prices. Reads from App Group shared storage.

**Technologies:** Swift (WidgetKit), App Group (`group.com.rahulboggaram.Spot.goldapp`)

**Key files:** `targets/widget/index.swift`

**Data flow:** App fetches prices from Supabase → writes to SharedGroupPreferences/ExtensionStorage → Widget reads and displays

### 3.3. PWA Admin

**Description:** Admin interface for updating gold and silver prices. Receives push notifications at 12:05pm and 5:05pm as reminders.

**Technologies:** Same Expo codebase (web build), Service Worker, Web Push API

**Key files:** `app/(admin)/admin.tsx`, `public/sw.js`

**Deployment:** Vercel (same deploy as consumer web)

### 3.4. Web App (Consumer)

**Description:** Web version of the price viewer with support and privacy pages.

**Technologies:** Expo web export, Vercel static hosting

**Key files:** `app/index.tsx`, `app/support.tsx`, `app/privacy.tsx`

**Deployment:** `npm run build:web` → Vercel (`dist/`)

**Live URL:** https://spot-app-bice.vercel.app

### 3.5. Edge Functions

#### 3.5.1. send-price-update-notification

**Description:** Sends push notifications to iOS app users when prices are updated in admin. Uses Expo Push API.

**Technologies:** Deno, Supabase Edge Functions, Expo Push API

**Trigger:** Called from admin when prices are saved

**Key file:** `supabase/functions/send-price-update-notification/index.ts`

#### 3.5.2. send-web-push-reminder

**Description:** Sends Web Push reminders to PWA admin subscribers at 12:05pm and 5:05pm IST on weekdays.

**Technologies:** Deno, npm:web-push, VAPID keys

**Trigger:** cron-job.org calls this at scheduled times

**Key file:** `supabase/functions/send-web-push-reminder/index.ts`

## 4. Data Stores

### 4.1. Supabase PostgreSQL

**Tables:**

| Table | Purpose |
|-------|---------|
| `market_prices` | Current/latest gold & silver prices (per gram/base). App, widget, and web read from here. |
| `device_tokens` | iOS Expo push tokens for sending price update notifications. |
| `web_push_subscriptions` | PWA Web Push endpoints (endpoint, p256dh, auth) for admin reminders. |
| `historical_prices` | Optional time-series for price history charts. |

### 4.2. iOS App Group Storage

**Type:** SharedGroupPreferences + ExtensionStorage

**Purpose:** Shared storage between main app and widget extension. App writes prices; widget reads them.

**App Group ID:** `group.com.rahulboggaram.Spot.goldapp`

## 5. External Integrations / APIs

| Service | Purpose | Method |
|---------|---------|--------|
| **Supabase** | Backend database, Edge Functions, auth | REST API via `@supabase/supabase-js` |
| **Expo Push API** | Send push notifications to iOS devices | REST API (`exp.host/--/api/v2/push/send`) |
| **Web Push (FCM/APNs)** | Send push to PWA (Chrome/Safari) | npm:web-push with VAPID |
| **cron-job.org** | Trigger 12:05pm/5:05pm reminders | HTTP POST to Edge Function |
| **Vercel** | Web hosting and deployment | CLI deploy / Git auto-deploy |
| **EAS (Expo)** | iOS build and App Store submission | CLI (`npx eas-cli`) |

## 6. Deployment & Infrastructure

| Platform | Method | URL/Target |
|----------|--------|------------|
| **iOS** | `npx eas-cli build --platform ios --profile production` → `npx eas-cli submit` | App Store Connect / TestFlight |
| **Web** | `npm run build:web && npx vercel --prod --yes` | https://spot-app-bice.vercel.app |
| **Edge Functions** | `npx supabase functions deploy <name>` | Supabase project `jvnrafvsycvlqfmepqjv` |
| **Source control** | Git → GitHub | https://github.com/rahulboggaram/Spot |

**CI/CD:** Manual (CLI commands). Vercel can auto-deploy on push to `main`.

## 7. Security Considerations

| Area | Details |
|------|---------|
| **Authentication** | Supabase anon key (public, in `lib/supabase.js`). No user auth required to view prices. |
| **Authorization** | Supabase RLS policies on all tables. Anon can insert/update tokens; service_role for Edge Functions. |
| **Secrets** | VAPID private key in Edge Function code + Supabase secrets. Supabase service_role key in Edge Function env. |
| **Encryption** | HTTPS everywhere. Web Push uses VAPID + payload encryption. |
| **App Store** | `ITSAppUsesNonExemptEncryption: false` in `app.json`. |

**Note:** Supabase anon key and VAPID public key are in client code (expected). Never commit service_role key or VAPID private key to client code.

## 8. Development & Testing

### Local Setup

```bash
git clone https://github.com/rahulboggaram/Spot.git
cd Spot
npm install
npm run web          # Start web dev server
npm run ios          # Start iOS dev (requires Xcode)
npm run start        # Start Expo dev server
```

### Key Scripts

| Command | Purpose |
|---------|---------|
| `npm run web` | Local web development |
| `npm run build:web` | Build web for Vercel |
| `npm run ios` | Run iOS in simulator |
| `npx eas-cli build --platform ios --profile production` | Production iOS build |
| `npx supabase functions deploy <name>` | Deploy Edge Function |

### Configuration

| File | Purpose |
|------|---------|
| `app.json` | Expo config: app name, iOS bundle ID, entitlements, plugins |
| `eas.json` | EAS Build profiles (dev, preview, production with autoIncrement) |
| `vercel.json` | Vercel: build command, output dir, SPA rewrites, SW headers |
| `lib/supabase.js` | Supabase URL + anon key |

## 9. Notification System

### iOS Push (Consumer App)

1. User opens app → app requests notification permission
2. App gets Expo Push Token (with `projectId`) → saves to `device_tokens` table
3. Admin updates prices → Edge Function `send-price-update-notification` is called
4. Edge Function reads tokens from `device_tokens` → sends via Expo Push API
5. iOS app receives notification → refreshes prices → updates widget

### Web Push (PWA Admin)

1. Admin opens PWA from home screen → taps "Test Notification" → allows notifications
2. Browser creates Web Push subscription → saved to `web_push_subscriptions` table
3. cron-job.org fires at 12:05pm/5:05pm IST on weekdays
4. Calls Edge Function `send-web-push-reminder` with Authorization header
5. Edge Function reads subscriptions → sends via npm:web-push with VAPID keys
6. Admin receives "Price Update Reminder" notification on iPhone

### VAPID Keys

- **Public:** `BAXLXgLJsuPNz19ye9iQRGd20aiNUiruzLtgISpvXHx78SdB8bJeTgTOO_qFMG_DH1SXuO7RmwS0Q326soghI3I`
- **Private:** Stored in Edge Function code and Supabase secrets
- **Subject:** `mailto:rahulboggaram@gmail.com`

## 10. Project Identification

| Field | Value |
|-------|-------|
| **Project Name** | Spot (GoldApp) |
| **Repository** | https://github.com/rahulboggaram/Spot |
| **Bundle ID** | `com.rahulboggaram.Spot` |
| **Apple Team ID** | `G4JSN2MWNK` |
| **Supabase Project** | `jvnrafvsycvlqfmepqjv` |
| **Expo Project ID** | `05f18532-8f5b-432d-8fc5-1ed619a84a05` |
| **Live Web URL** | https://spot-app-bice.vercel.app |
| **Support URL** | https://spot-app-bice.vercel.app/support |
| **Privacy Policy URL** | https://spot-app-bice.vercel.app/privacy |
| **Primary Contact** | rahulboggaram@gmail.com |
| **Date of Last Update** | 2026-02-09 |

## 11. Maintenance Checklist

| Task | Frequency | Notes |
|------|-----------|-------|
| Update npm dependencies | Quarterly | `npm audit`, `npm update` |
| Bump iOS buildNumber (or EAS autoIncrement) | Every TestFlight/App Store build | In `app.json` if manual |
| Renew Apple certs & API Key | Yearly | App Store Connect, `eas credentials` |
| Supabase: check usage, backups | Quarterly | Apply migrations, check RLS |
| Test notifications (iOS + PWA) | After any push/cron change | curl Edge Functions |
| Clean up old EAS builds / Vercel deploys | Occasionally | Avoid clutter |
| Check cron-job.org is running | Monthly | Verify 12:05pm/5:05pm jobs active |

## 12. Glossary

| Term | Definition |
|------|-----------|
| **EAS** | Expo Application Services (build + submit) |
| **VAPID** | Voluntary Application Server Identification (Web Push auth) |
| **PWA** | Progressive Web App (web app added to home screen) |
| **RLS** | Row Level Security (Supabase/Postgres access control) |
| **App Group** | iOS mechanism for sharing data between app and extensions |
| **IST** | Indian Standard Time (UTC+5:30) |
| **TestFlight** | Apple's beta testing platform for iOS apps |
