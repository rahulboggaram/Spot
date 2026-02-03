# Quick Deployment Instructions

## 🌐 Deploy to Web (Vercel)

### Step 1: Build the Web Version
```bash
npm run build:web
```
This creates a `dist` folder with all static files.

### Step 2: Deploy to Vercel
```bash
# Navigate to the dist folder
cd dist

# Deploy (no installation needed)
npx vercel

# Follow the prompts:
# - Set up and deploy? → Y
# - Which scope? → Select your account
# - Link to existing project? → Y (if you already have a project) or N (for new)
# - Project name? → Press Enter for default or type a name
# - Directory? → . (current directory, which is dist)
```

**OR** if you already have a Vercel project linked:
```bash
# From project root
npx vercel --prod
```

### Step 3: Verify
- Your app will be live at `your-project.vercel.app`
- Changes should appear immediately after deployment

---

## 📱 Deploy Native App (iOS/Android)

### For iOS App Store:

1. **Install EAS CLI** (if not already installed):
```bash
npm i -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure build** (first time only):
```bash
eas build:configure
```

4. **Build for iOS**:
```bash
eas build --platform ios --profile production
```
This will:
- Create a production build
- Upload to Expo servers
- Provide a download link or submit to App Store

5. **Submit to App Store** (optional):
```bash
eas submit --platform ios
```

### For Google Play Store:

1. **Build for Android**:
```bash
eas build --platform android --profile production
```

2. **Submit to Play Store** (optional):
```bash
eas submit --platform android
```

---

## 🔄 Quick Update Workflow

### For Web Updates:
```bash
# 1. Make your code changes
# 2. Build
npm run build:web

# 3. Deploy
cd dist
npx vercel --prod
# OR from root: npx vercel --prod
```

### For Native App Updates:
```bash
# 1. Make your code changes
# 2. Build and submit
eas build --platform ios --profile production
eas build --platform android --profile production

# 3. Submit to stores (if needed)
eas submit --platform ios
eas submit --platform android
```

---

## 📝 Notes

- **Web**: Changes go live immediately after Vercel deployment
- **Native Apps**: Need to go through App Store/Play Store review process (can take 1-3 days)
- **PWA**: Web version works as PWA - users can "Add to Home Screen" on iOS/Android
- **Environment Variables**: Make sure Supabase keys are set in Vercel dashboard (Settings → Environment Variables)

---

## 🚀 Current Live URLs

Based on your previous deployment:
- **Consumer/Home**: `https://spot-app-bice.vercel.app/`
- **Admin**: `https://spot-app-bice.vercel.app/admin`
- **Price History**: `https://spot-app-bice.vercel.app/price-history`
- **Widget Preview**: `https://spot-app-bice.vercel.app/widget-preview`
