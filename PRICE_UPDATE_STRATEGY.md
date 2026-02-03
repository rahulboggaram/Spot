# Price Update Strategy

## Overview

Since Supabase Realtime replication is in alpha and not available to all users, we use a **hybrid approach** for price updates:

1. **Polling** (Primary): Checks for updates every 30 seconds
2. **Push Notifications** (Instant): Provides immediate updates when available
3. **Manual Refresh**: Users can pull-to-refresh on the home page

## How It Works

### 1. Polling Mechanism (Web & iOS App)

The app automatically polls for price updates every 30 seconds:

```typescript
// Polling fallback: Check for price updates every 30 seconds
const pollingInterval = setInterval(() => {
  fetchPrices();
}, 30000); // Poll every 30 seconds
```

**Benefits**:
- ✅ Works without any Supabase alpha features
- ✅ Reliable and predictable
- ✅ Updates within 10 seconds of admin changes

**Trade-offs**:
- ⏱️ Not instant (up to 10 second delay)
- 🔋 Uses slightly more battery (minimal impact)

### 2. Push Notifications (iOS App & Widget)

For instant updates, we use push notifications:

1. **App registers** for push notifications on startup
2. **Admin page triggers** Supabase Edge Function after price update
3. **Edge Function sends** push notifications to all registered devices
4. **App receives notification** and immediately fetches new prices
5. **Widget updates** automatically

**Benefits**:
- ✅ Instant updates (when push notifications work)
- ✅ Works even when app is in background
- ✅ Updates widget automatically

**Requirements**:
- Edge Function must be deployed
- Device tokens table must exist
- Push notification permissions granted

### 3. Manual Refresh

Users can pull down on the home page to manually refresh prices at any time.

## Implementation Details

### Polling Interval

Currently set to **10 seconds**. This provides a good balance between:
- Update frequency (responsive updates)
- Battery usage (reasonable for active use)
- Server load (acceptable request rate)

You can adjust this in `app/index.tsx`:

```typescript
const pollingInterval = setInterval(() => {
  fetchPrices();
}, 10000); // Change this value (in milliseconds)
```

**Recommended intervals**:
- **5 seconds**: Very responsive, higher battery usage
- **10 seconds**: Good balance (current)
- **15 seconds**: More battery efficient, still responsive
- **30 seconds**: Less battery, slower updates

### When Polling Runs

- ✅ When app is **active** (foreground)
- ✅ When app is in **background** (iOS continues polling)
- ❌ When app is **closed** (polling stops)

### Push Notification Flow

```
Admin Updates Price
    ↓
Edge Function Called
    ↓
Push Notifications Sent
    ↓
iOS App Receives Notification
    ↓
fetchPrices() Called
    ↓
Widget Updated
```

## Setup Instructions

### 1. Polling (Already Working!)

✅ **No setup needed** - polling is already implemented and working!

### 2. Push Notifications (Optional - For Instant Updates)

See `REALTIME_SETUP.md` for:
- Creating `device_tokens` table
- Deploying Edge Function
- Configuring Expo Push

## Future: When Realtime Becomes Available

If Supabase Realtime replication becomes available to your project:

1. Replace polling with Realtime subscription
2. Keep push notifications for widget updates
3. Best of both worlds: instant updates + widget support

The code structure is already in place - just uncomment the Realtime subscription and remove polling.

## Testing

### Test Polling:

1. Open home page
2. Update prices from admin
3. Wait up to 30 seconds
4. Home page should update automatically ✅

### Test Push Notifications:

1. Register device (happens automatically)
2. Update prices from admin
3. App should update instantly (if Edge Function is deployed) ✅

## Troubleshooting

### Polling Not Working?

- Check browser/device console for errors
- Verify Supabase connection is working
- Check network connectivity

### Updates Too Slow?

- Reduce polling interval (e.g., 15 seconds)
- Enable push notifications for instant updates

### Battery Usage Concerns?

- Increase polling interval (e.g., 60 seconds)
- Push notifications are more battery-efficient
