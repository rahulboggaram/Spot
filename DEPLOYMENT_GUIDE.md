# Deployment Guide - All Platforms

This guide covers deploying your app to **Web (Vercel)**, **iOS App Store**, and **Android Play Store**.

## 🚀 Quick Deploy (All Platforms)

### 1. Web Deployment (Vercel) - ~5 minutes

```bash
# Build and deploy web app
npm run build:web && npx vercel --prod --yes
```

**What this does:**
- Builds the web app using Expo
- Deploys to Vercel production
- Updates your live website immediately

**Your web app will be live at:** `https://spot-app-bice.vercel.app` (or your custom domain)

---

### 2. iOS App Deployment - ~30-60 minutes

#### Option A: Using EAS Build (Recommended)

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (if not already done)
eas build:configure

# Build for iOS App Store
eas build --platform ios --profile production
```

**What this does:**
- Creates a production build of your iOS app
- Uploads to Expo servers
- Provides download link and App Store submission instructions

#### Option B: Local Build (Xcode)

```bash
# Generate native iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/Spot.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device" or your device
# 2. Product → Archive
# 3. Distribute App → App Store Connect
```

---

### 3. Android App Deployment - ~30-60 minutes

#### Option A: Using EAS Build (Recommended)

```bash
# Build for Android Play Store
eas build --platform android --profile production
```

#### Option B: Local Build (Android Studio)

```bash
# Generate native Android project
npx expo prebuild --platform android

# Open in Android Studio
# Build → Generate Signed Bundle/APK
```

---

## 📋 Detailed Steps

### Web Deployment (Vercel)

#### Prerequisites:
- ✅ Vercel account connected to your GitHub repo
- ✅ `vercel.json` configured (already done)

#### Steps:

1. **Build the web app:**
   ```bash
   npm run build:web
   ```
   This creates a `dist/` folder with the static web files.

2. **Deploy to Vercel:**
   ```bash
   npx vercel --prod --yes
   ```
   
   Or if you have Vercel CLI installed:
   ```bash
   vercel --prod
   ```

3. **Verify deployment:**
   - Check your Vercel dashboard
   - Visit your live URL
   - Test price updates (should work within 10 seconds)

#### Automatic Deployment (GitHub Integration):

If your repo is connected to Vercel:
- ✅ **Every push to `main` branch** automatically deploys
- ✅ No manual deployment needed!

---

### iOS App Deployment

#### Prerequisites:
- ✅ Apple Developer Account ($99/year)
- ✅ EAS account (free) or Expo account
- ✅ App Store Connect app created

#### Step 1: Configure EAS

Create `eas.json` in your project root:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.rahulboggaram.Spot"
      }
    },
    "development": {
      "ios": {
        "bundleIdentifier": "com.rahulboggaram.Spot",
        "developmentClient": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

#### Step 2: Build iOS App

```bash
# Build for App Store
eas build --platform ios --profile production
```

This will:
1. Ask for your Apple credentials
2. Build the app in the cloud
3. Provide a download link
4. Take ~30-60 minutes

#### Step 3: Submit to App Store

```bash
# After build completes, submit automatically
eas submit --platform ios --profile production
```

Or manually:
1. Download the `.ipa` file from EAS
2. Use **Transporter** app (Mac) to upload
3. Or use Xcode → Window → Organizer → Distribute App

#### Step 4: App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Fill in app information, screenshots, etc.
4. Submit for review

---

### Android App Deployment

#### Prerequisites:
- ✅ Google Play Developer Account ($25 one-time)
- ✅ EAS account (free) or Expo account

#### Step 1: Configure EAS

Add to `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "package": "com.rahulboggaram.Spot"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./path/to/service-account-key.json",
        "track": "production"
      }
    }
  }
}
```

#### Step 2: Build Android App

```bash
# Build for Play Store
eas build --platform android --profile production
```

#### Step 3: Submit to Play Store

```bash
# After build completes
eas submit --platform android --profile production
```

Or manually:
1. Download the `.aab` file from EAS
2. Go to [Google Play Console](https://play.google.com/console)
3. Upload the bundle
4. Fill in store listing
5. Submit for review

---

## 🔄 Update Existing Apps

### Web (Vercel)
```bash
npm run build:web && npx vercel --prod --yes
```

### iOS (EAS)
```bash
# Build new version
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### Android (EAS)
```bash
# Build new version
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

---

## 🧪 Testing Before Deployment

### Test Web Locally:
```bash
npm run build:web
npx serve dist
```

### Test iOS Locally:
```bash
npx expo run:ios
```

### Test Android Locally:
```bash
npx expo run:android
```

---

## 📱 Version Management

### Update Version Numbers:

**For Web:** No version needed (always latest)

**For iOS/Android:** Update in `app.json`:

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

## 🚨 Common Issues

### Web Deployment Fails?

1. **Check build errors:**
   ```bash
   npm run build:web
   ```

2. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on failed deployment → View logs

3. **Clear cache:**
   ```bash
   rm -rf dist .expo
   npm run build:web
   ```

### iOS Build Fails?

1. **Check credentials:**
   ```bash
   eas credentials
   ```

2. **Check app.json:**
   - Verify `bundleIdentifier` matches
   - Verify `appleTeamId` is correct

3. **Check EAS build logs:**
   - Go to [expo.dev](https://expo.dev) → Your Project → Builds

### Android Build Fails?

1. **Check package name:**
   - Verify `package` in `eas.json` matches `app.json`

2. **Check keystore:**
   ```bash
   eas credentials
   ```

---

## ✅ Deployment Checklist

### Before Deploying:

- [ ] Test all features locally
- [ ] Update version number (iOS/Android)
- [ ] Test price updates (10-second polling)
- [ ] Test widget updates (iOS)
- [ ] Test push notifications (iOS)
- [ ] Check console for errors
- [ ] Verify Supabase connection

### After Deploying:

- [ ] Test web app on live URL
- [ ] Test iOS app (TestFlight or App Store)
- [ ] Test Android app (Internal Testing or Play Store)
- [ ] Verify price updates work
- [ ] Check analytics/monitoring

---

## 🎯 Quick Reference

| Platform | Command | Time |
|----------|---------|------|
| **Web** | `npm run build:web && npx vercel --prod --yes` | ~5 min |
| **iOS** | `eas build --platform ios --profile production` | ~30-60 min |
| **Android** | `eas build --platform android --profile production` | ~30-60 min |

---

## 📞 Need Help?

- **Vercel Issues:** [Vercel Docs](https://vercel.com/docs)
- **EAS Issues:** [EAS Docs](https://docs.expo.dev/build/introduction/)
- **Expo Issues:** [Expo Docs](https://docs.expo.dev/)

---

## 🔄 Continuous Deployment

### Set up GitHub Actions (Optional):

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build:web
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

This automatically deploys web on every push to `main`!
