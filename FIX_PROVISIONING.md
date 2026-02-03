# Fix Provisioning Profile Error

## The Error
"No profiles for 'com.rahulboggaram.Spot' were found"

## What It Means
Xcode needs a "provisioning profile" to sign your app. It's like a certificate that proves your app is allowed to run on devices or be distributed.

## How to Fix (Step by Step)

### Step 1: Open Xcode
1. Open `ios/Spot.xcworkspace` (NOT `.xcodeproj`)

### Step 2: Fix Main App Signing
1. Click the **"Spot"** project (blue icon) in the left sidebar
2. Select the **"Spot"** target (under TARGETS, not PROJECT)
3. Click **"Signing & Capabilities"** tab
4. **Check the box** for "Automatically manage signing"
5. In the **"Team"** dropdown, select your team:
   - If you have Apple Developer account: Select your team name
   - If you only have free account: Select "Rahul Boggaram (Personal Team)"
6. Xcode will automatically create the provisioning profile

### Step 3: Fix Widget Signing
1. Still in the same project settings
2. Select the **"widget"** target (under TARGETS)
3. Click **"Signing & Capabilities"** tab
4. **Check the box** for "Automatically manage signing"
5. Select the **same Team** as above
6. Confirm Bundle Identifier shows: `com.rahulboggaram.Spot.widget`

### Step 4: Verify Both Targets
Make sure BOTH targets have:
- ✅ "Automatically manage signing" checked
- ✅ Team selected (same team for both)
- ✅ Bundle identifiers correct:
  - Spot: `com.rahulboggaram.Spot`
  - widget: `com.rahulboggaram.Spot.widget`

### Step 5: Clean and Try Again
1. Product → Clean Build Folder (`Cmd + Shift + K`)
2. Product → Archive

## If It Still Doesn't Work

### Option A: Register Bundle Identifier Manually
1. Go to https://developer.apple.com/account
2. Click "Certificates, Identifiers & Profiles"
3. Click "Identifiers" → "+" button
4. Select "App IDs" → Continue
5. Select "App" → Continue
6. Description: "Spot"
7. Bundle ID: `com.rahulboggaram.Spot` (exact match)
8. Enable "App Groups" capability
9. Click "Continue" → "Register"

### Option B: Use Different Bundle Identifier
If `com.rahulboggaram.Spot` is taken or causing issues, you can change it:
1. In Xcode, change Bundle Identifier to something unique like:
   - `com.rahulboggaram.SpotApp`
   - `com.rahulboggaram.GoldSpot`
2. Update widget bundle ID to match: `[new-id].widget`
3. Update `app.json` with new bundle identifier

## Common Issues

**"Personal Team" limitations:**
- Free Apple ID can only install on your own devices
- Can't distribute to App Store
- Need paid Developer account ($99/year) for App Store

**"Bundle ID already exists":**
- Someone else is using that bundle ID
- Change to something more unique

**"Team has no devices":**
- This is OK for App Store builds
- Ignore this warning if you're archiving for App Store

