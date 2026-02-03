# Real-time Price Updates Setup Guide

## Overview

This app now supports **instant price updates** across all platforms when admin updates prices:

1. **Web/Home Page**: Uses Supabase Realtime subscription (instant)
2. **iOS App**: Uses Supabase Realtime subscription (instant)
3. **iOS Widget**: Uses push notifications (near-instant when app is running)

## How It Works

### 1. Supabase Realtime (Web & iOS App)

The home page (`app/index.tsx`) automatically subscribes to `market_prices` table changes:

```typescript
const channel = supabase
  .channel('market_prices_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'market_prices',
  }, async (payload) => {
    // Instantly fetch new prices when admin updates
    await fetchPrices();
  })
  .subscribe();
```

**Result**: When admin inserts a new price, all open web pages and iOS apps instantly update! ✅

### 2. Push Notifications (iOS Widget)

For the iOS widget to update, we use push notifications:

1. **App registers for push notifications** on startup
2. **Push token is saved** to Supabase `device_tokens` table
3. **Admin page triggers** Supabase Edge Function after price update
4. **Edge Function sends** push notifications to all registered devices
5. **App receives notification** and updates widget

## Setup Instructions

### Step 1: Enable Supabase Realtime

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for the `market_prices` table
4. This allows Realtime subscriptions to work

### Step 2: Create Device Tokens Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS device_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
```

### Step 3: Deploy Supabase Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy send-price-update-notification
   ```

5. Set environment variables in Supabase Dashboard:
   - Go to **Edge Functions** → **send-price-update-notification** → **Settings**
   - Add: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Configure Expo Push Notifications

1. Get your Expo project ID:
   ```bash
   npx expo whoami
   npx expo projects:list
   ```

2. Update `app.json` with your project ID:
   ```json
   {
     "expo": {
       "extra": {
         "eas": {
           "projectId": "your-project-id"
         }
       }
     }
   }
   ```

3. For production, you'll need to configure EAS:
   ```bash
   eas build:configure
   ```

## Alternative: Database Trigger (Automatic)

Instead of calling the function from admin page, you can set up a database trigger:

```sql
-- Create a function that calls the edge function
CREATE OR REPLACE FUNCTION notify_price_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Supabase Edge Function via HTTP
  PERFORM
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-price-update-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'goldPrice', NEW.gold_999_base,
        'silverPrice', NEW.silver_base
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_price_insert
  AFTER INSERT ON market_prices
  FOR EACH ROW
  EXECUTE FUNCTION notify_price_update();
```

## Testing

1. **Test Realtime (Web)**:
   - Open home page in browser
   - Open admin page in another tab
   - Update prices in admin
   - Home page should update instantly! ✅

2. **Test Realtime (iOS App)**:
   - Open app on iPhone
   - Update prices from admin (web or another device)
   - App should update instantly! ✅

3. **Test Push Notifications**:
   - Register device token (happens automatically on app open)
   - Update prices from admin
   - Check Supabase Edge Function logs
   - Widget should update when app receives notification

## Troubleshooting

### Realtime Not Working?

1. Check Supabase Dashboard → Database → Replication
2. Ensure `market_prices` table has replication enabled
3. Check browser console for subscription status
4. Verify Supabase project has Realtime enabled (free tier supports it)

### Push Notifications Not Working?

1. Check if `device_tokens` table exists and has entries
2. Verify Edge Function is deployed and has correct env vars
3. Check Edge Function logs in Supabase Dashboard
4. Ensure app has notification permissions granted
5. Verify Expo push token is being generated

### Widget Not Updating?

1. Widget can only update when app is running (foreground or background)
2. Check if `SharedGroupPreferences` is working (iOS only)
3. Verify widget extension has App Group access
4. Check Xcode console for widget errors

## Current Status

✅ **Realtime Subscription**: Implemented and working  
✅ **Push Notification Registration**: Implemented  
⏳ **Edge Function**: Needs deployment  
⏳ **Database Trigger**: Optional (alternative to admin page call)
