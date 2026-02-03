# Deployment Guide for Spot App

## Making Your App Live

### Option 1: Deploy Web/PWA (Recommended for Quick Setup)

#### Step 1: Build the Web Version
```bash
npm run build:web
```
This creates a `dist` folder with static files.

#### Step 2: Deploy to a Hosting Service

**Option A: Vercel (Easiest)**
1. Run: `npx vercel` from project root (no installation needed)
2. Follow prompts to deploy
3. Your app will be live at `your-app.vercel.app`

**Option B: Netlify**
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod --dir=web-build`
3. Follow prompts to deploy

**Option C: Expo Hosting**
1. Install EAS CLI: `npm i -g eas-cli`
2. Run: `eas build:configure`
3. Run: `eas update --branch production --platform web`

**Option D: Any Static Hosting**
- Upload the `web-build` folder contents to:
  - GitHub Pages
  - AWS S3 + CloudFront
  - Firebase Hosting
  - Any web server

### Option 2: Deploy Native Apps

#### For iOS App Store:
```bash
# Install EAS CLI
npm i -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### For Google Play Store:
```bash
# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

## Separate URLs for Admin and Consumer

### Current Setup:
- **Consumer/Home**: `https://spot-app-bice.vercel.app/` (or `/`)
- **Admin**: `https://spot-app-bice.vercel.app/admin`
- **Widget Preview**: `https://spot-app-bice.vercel.app/widget-preview`

### Option 1: Use Path-Based URLs (Already Working)
Your admin is already accessible at separate paths:
- Consumer: `https://spot-app-bice.vercel.app/`
- Admin: `https://spot-app-bice.vercel.app/admin`

### Option 2: Deploy Admin as Separate Vercel Project

To get a completely separate URL for admin (e.g., `spot-admin.vercel.app`):

1. **Create a separate build for admin only** (optional - you can use the same build)
2. **Deploy to a new Vercel project**:
   ```bash
   cd dist
   npx vercel
   # When asked for project name, use: spot-admin (or spot-admin-app)
   ```

3. **Configure Vercel rewrites** (if you want admin at root):
   Create `vercel.json` in the admin project:
   ```json
   {
     "rewrites": [
       { "source": "/", "destination": "/admin.html" },
       { "source": "/widget-preview", "destination": "/widget-preview.html" }
     ]
   }
   ```

### Option 3: Use Custom Domain with Subdomain

If you have a custom domain, you can:
1. Add main domain: `spotapp.com` → points to consumer (`/`)
2. Add subdomain: `admin.spotapp.com` → points to admin (`/admin`)

In Vercel Dashboard:
- Add `spotapp.com` → Production deployment
- Add `admin.spotapp.com` → Same deployment, but configure rewrites to show `/admin` at root

## PWA Setup for iPhone

### Requirements:
- iOS 16.4+ (for PWA notifications)
- HTTPS (required for PWA)
- Proper manifest configuration (already done in app.json)

### Steps to Install PWA on iPhone:

1. **Deploy your app to a live HTTPS URL** (use one of the options above)

2. **Open Safari on iPhone** (not Chrome - Safari is required for PWA)

3. **Navigate to your deployed URL**

4. **Tap the Share button** (square with arrow)

5. **Select "Add to Home Screen"**

6. **Customize the name** (defaults to "Spot Admin")

7. **Tap "Add"**

The app will now appear on your home screen and work like a native app!

### PWA Notifications on iOS

Your app already has `expo-notifications` configured. For web/PWA notifications:

1. **Request Permission** (already implemented in your code)
2. **Use Web Push API** (iOS 16.4+ supports this)
3. **Ensure HTTPS** (required for notifications)

The notifications will work when:
- App is installed as PWA
- User has granted notification permissions
- App is served over HTTPS

## Important Notes:

1. **HTTPS Required**: PWAs and notifications require HTTPS. All hosting services above provide HTTPS automatically.

2. **Service Worker**: Expo automatically generates a service worker for PWA functionality.

3. **Notifications**: 
   - Native apps: Use `expo-notifications` (already configured)
   - PWA: Uses Web Push API (works on iOS 16.4+)

4. **Environment Variables**: Make sure your Supabase URL and keys are accessible in production.

## Quick Start (Vercel - Recommended)

```bash
# 1. Build web version
npm run build:web

# 2. Deploy with Vercel (no installation needed)
npx vercel

# 3. Follow the prompts:
#    - Set up and deploy? Y
#    - Which scope? (select your account)
#    - Link to existing project? N (for first time)
#    - Project name? (press enter for default)
#    - Directory? ./dist (or ./web-build depending on Expo version)

# 4. Your app is live! Share the URL and add to home screen on iPhone
```

## Adding a Custom Domain

### Option 1: Vercel (Easiest)

1. **Deploy your app first** (follow Quick Start above)

2. **Go to Vercel Dashboard**: https://vercel.com/dashboard

3. **Select your project**

4. **Go to Settings → Domains**

5. **Add your domain**:
   - Enter your domain (e.g., `spotapp.com` or `admin.spotapp.com`)
   - Vercel will provide DNS records to add

6. **Update your DNS** (at your domain registrar):
   - Add the CNAME or A record provided by Vercel
   - Wait for DNS propagation (usually 5-60 minutes)

7. **SSL Certificate**: Vercel automatically provisions SSL certificates for your domain

### Option 2: Netlify

1. **Deploy your app**:
   ```bash
   netlify deploy --prod --dir=web-build
   ```

2. **Add domain in Netlify Dashboard**:
   - Go to Site settings → Domain management
   - Click "Add custom domain"
   - Enter your domain

3. **Configure DNS**:
   - Netlify will provide DNS records
   - Add them at your domain registrar

4. **SSL**: Netlify automatically provides SSL certificates

### Option 3: Other Hosting Services

**AWS S3 + CloudFront + Route 53**:
- Upload to S3 bucket
- Create CloudFront distribution
- Use Route 53 for DNS

**Firebase Hosting**:
```bash
npm i -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```
Then add custom domain in Firebase Console

**GitHub Pages** (if using GitHub):
- Push `web-build` to `gh-pages` branch
- Configure custom domain in repository settings

### DNS Configuration

For most hosting services, you'll need to add one of these:

**Option A: CNAME Record** (for subdomains like `admin.yourdomain.com`)
```
Type: CNAME
Name: admin (or @ for root)
Value: your-hosting-service-provided-url
```

**Option B: A Record** (for root domain like `yourdomain.com`)
```
Type: A
Name: @
Value: IP address provided by hosting service
```

**Option C: ALIAS/ANAME Record** (some registrars support this for root domains)
```
Type: ALIAS
Name: @
Value: your-hosting-service-provided-url
```

### Important Notes for Custom Domains:

1. **HTTPS Required**: All hosting services provide free SSL certificates automatically
2. **DNS Propagation**: Can take 5 minutes to 48 hours (usually 5-60 minutes)
3. **WWW vs Non-WWW**: Decide if you want `www.yourdomain.com` or just `yourdomain.com`
4. **Subdomains**: You can use subdomains like `admin.yourdomain.com` or `app.yourdomain.com`

### Testing Your Domain

After DNS propagation:
```bash
# Check if DNS is working
nslookup yourdomain.com

# Test HTTPS
curl -I https://yourdomain.com
```

## Testing PWA Locally

```bash
# Build for web
npm run build:web

# Serve locally with HTTPS (required for PWA features)
npx serve -s web-build --listen 3000
# Or use a tool like local-ssl-proxy for HTTPS
```

## Troubleshooting

- **PWA not installing**: Ensure you're using Safari on iOS, not Chrome
- **Notifications not working**: Check that you're on iOS 16.4+ and have granted permissions
- **Build errors**: Make sure all dependencies are installed (`npm install`)
- **Empty dist folder**: Run `npm run build:web` first, then check the dist folder
