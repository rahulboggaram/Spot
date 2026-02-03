# Quick Deploy - All Platforms

## 🚀 Deploy Web (Vercel) - ~5 minutes

```bash
npm run build:web && npx vercel --prod --yes
```

**What this does:**
- Builds the web app
- Deploys to Vercel production
- Your website is live immediately!

**Your web URL:** `https://spot-app-bice.vercel.app` (or your custom domain)

---

## 📱 Deploy iOS App - ~30-60 minutes

### Option 1: EAS Build (Recommended - Cloud Build)

```bash
# First time only: Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for App Store
eas build --platform ios --profile production

# After build completes, submit to App Store
eas submit --platform ios --profile production
```

### Option 2: Local Build (Xcode)

```bash
# Generate iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/Spot.xcworkspace

# In Xcode: Product → Archive → Distribute App
```

---

## 🤖 Deploy Android App - ~30-60 minutes

### Option 1: EAS Build (Recommended - Cloud Build)

```bash
# Build for Play Store
eas build --platform android --profile production

# After build completes, submit to Play Store
eas submit --platform android --profile production
```

### Option 2: Local Build (Android Studio)

```bash
# Generate Android project
npx expo prebuild --platform android

# Open in Android Studio
# Build → Generate Signed Bundle/APK
```

---

## ✅ What Changed in This Update

1. **Graph width fix** - Full width on mobile
2. **30D date filtering** - Shows correct 30 days from today
3. **Viewport fix** - Shows all 30 days, not just 1/3
4. **10-second polling** - Faster price updates

---

## 🧪 Test Before Deploying

### Test Locally:
```bash
# Web
npm run build:web
npx serve dist

# iOS
npx expo run:ios

# Android
npx expo run:android
```

---

## 📋 Deployment Checklist

- [ ] Test graph shows full width on mobile
- [ ] Test 30D shows all 30 days (Dec 30 - Jan 28)
- [ ] Test price updates work (10-second polling)
- [ ] Update version number in `app.json` (if deploying apps)
- [ ] Deploy web first (fastest)
- [ ] Deploy iOS/Android if needed

---

## 🔄 Update Version Numbers (For Apps)

Before building new app versions, update `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",  // Increment this
    "ios": {
      "buildNumber": "2"  // Increment for each App Store submission
    },
    "android": {
      "versionCode": 2  // Increment for each Play Store submission
    }
  }
}
```

---

## ⚡ Quick Reference

| Platform | Command | Time |
|----------|---------|------|
| **Web** | `npm run build:web && npx vercel --prod --yes` | ~5 min |
| **iOS** | `eas build --platform ios --profile production` | ~30-60 min |
| **Android** | `eas build --platform android --profile production` | ~30-60 min |

---

## 🆘 Need Help?

- **Web Issues:** Check Vercel dashboard → Deployments → Logs
- **EAS Issues:** Check [expo.dev](https://expo.dev) → Your Project → Builds
- **Full Guide:** See `DEPLOYMENT_GUIDE.md` for detailed instructions
