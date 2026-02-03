# PWA Notifications (iOS Home Screen)

Notifications when the web app is **saved to the home screen on iPhone** require **Web Push** (server-sent push). Local timers and Periodic Background Sync do **not** run when the PWA is closed or in the background on iOS.

## What’s implemented

1. **Service worker** (`/public/sw.js`)
   - Handles **push** events (server-sent Web Push).
   - Still handles local/periodic checks when the app is open.

2. **Admin page** (`app/(admin)/admin.tsx`)
   - “Test Notification” requests permission (required on iOS: user gesture).
   - After permission, subscribes to Web Push (if VAPID public key is set) and saves the subscription to Supabase.

3. **Backend**
   - Table: `web_push_subscriptions` (endpoint, p256dh, auth).
   - Edge function: `send-web-push-reminder` — sends a Web Push to all stored subscriptions. Intended to be called at **12:00** and **17:00** on weekdays by a cron job.

## One-time setup (required for iOS PWA reminders when app is closed)

### 1. Generate VAPID keys

With Deno installed:

```bash
deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts
```

You’ll see:

- **First output (JSON):** VAPID keys in JWK format. Copy this **entire JSON** (one object with `publicKey` and `privateKey`).
- **Second line (stderr):** `your application server key is: <base64url string>`. Copy the **base64url string** (no spaces).

### 2. Supabase

- **Run the migration** that creates `web_push_subscriptions`:
  - In Supabase Dashboard → SQL Editor, run the contents of  
    `supabase/migrations/20250128000000_create_web_push_subscriptions.sql`.

- **Secrets for the Edge Function**
  - In project settings or via CLI, set:
    - `VAPID_KEYS_JSON` = the **full JSON** from step 1 (first output).

- **Deploy the Edge Function**
  - Deploy `send-web-push-reminder` (e.g. `supabase functions deploy send-web-push-reminder`).

### 3. App (Expo) env

- Set the **public** VAPID key so the PWA can subscribe:
  - `EXPO_PUBLIC_VAPID_PUBLIC_KEY` = the **application server key** (base64url string from step 1, second line).
- Use a `.env` or your hosting env (e.g. Vercel) and ensure this is available at build time for web.

### 4. Schedule the reminder (cron)

Call the Edge Function at **12:00** and **17:00** on **weekdays** (your server’s timezone).

- **Option A – cron-job.org (or similar)**
  - Create two cron jobs:
    - One: `0 12 * * 1-5` (12:00 Mon–Fri).
    - Other: `0 17 * * 1-5` (17:00 Mon–Fri).
  - Request URL:  
    `https://<project-ref>.supabase.co/functions/v1/send-web-push-reminder`  
  - Method: POST.  
  - Headers: `Authorization: Bearer <SUPABASE_ANON_KEY>` (or service role if you prefer and keep it secret).

- **Option B – Supabase pg_cron + pg_net**
  - Enable pg_net and pg_cron, then schedule two cron entries that call the function URL at 12:00 and 17:00 on weekdays.

## User flow (iOS)

1. Open the **admin** page in **Safari**.
2. Use **Add to Home Screen** so it runs as a PWA.
3. Open the PWA, go to admin, tap **“Test Notification”**.
4. Allow notifications when prompted.
5. The app subscribes to Web Push and saves the subscription. You should see a test notification and (if env is set) a console log like “Web Push subscription saved”.
6. When the cron runs at 12:00 or 17:00 on a weekday, the Edge Function sends a Web Push to all stored subscriptions; the PWA will show the reminder even if the app is **closed** or in the background.

## Troubleshooting

- **No reminder when app is closed**
  - Confirm `EXPO_PUBLIC_VAPID_PUBLIC_KEY` is set and the admin page is opened from the **PWA** (home screen icon), not Safari.
  - Confirm you tapped “Test Notification” **after** adding to home screen and granted permission.
  - Confirm the migration was run and the Edge Function is deployed with `VAPID_KEYS_JSON` set.
  - Confirm the cron is calling `send-web-push-reminder` at 12:00 and 17:00 on weekdays.

- **“Web Push subscription skipped” in console**
  - VAPID public key is missing or invalid. Set `EXPO_PUBLIC_VAPID_PUBLIC_KEY` to the application server key (base64url) from the generate script.

- **Reminders only when app is open**
  - That’s the old local/periodic path. For closed-app reminders you must complete the setup above (VAPID, table, Edge Function, cron).

## Summary

| Scenario                         | Works? |
|----------------------------------|--------|
| App open (any platform)          | Yes (local schedule + optional Web Push). |
| PWA in background / closed (iOS) | Yes only if Web Push is set up (VAPID, table, Edge Function, cron). |
