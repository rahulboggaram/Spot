# Troubleshooting: App Not Loading Locally

## Quick Checks

### 1. Is Metro Bundler Running?

**The app requires Metro bundler to be running!**

```bash
# Start Metro bundler
npm start
# or
npx expo start
```

**Keep Metro running** in a terminal window. The app won't load without it.

### 2. Check for JavaScript Errors

Open the Metro bundler terminal and look for:
- Red error messages
- Stack traces
- "Unable to resolve module" errors

### 3. Check Xcode Console (iOS)

If running on iOS simulator/device:
1. Open Xcode
2. Go to **View → Debug Area → Activate Console** (Shift+Cmd+C)
3. Look for red error messages
4. Check for crashes or exceptions

### 4. Check React Native Debugger

If you have React Native Debugger installed:
- Look for JavaScript errors in the console
- Check the Network tab for failed requests

## Common Issues

### Issue: "Unable to resolve module"

**Fix:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: "Metro bundler not found"

**Fix:**
```bash
# Make sure you're in the project directory
cd "/Users/rahulboggaram/GoldApp"
npm start
```

### Issue: App crashes immediately on launch

**Possible causes:**
1. **Native module not linked** - Run `cd ios && pod install && cd ..`
2. **JavaScript error** - Check Metro bundler console
3. **Missing permissions** - Check Info.plist for required permissions

**Fix:**
```bash
# Clean and rebuild
cd ios
rm -rf build
pod install
cd ..
npx expo run:ios
```

### Issue: White/Black screen (nothing loads)

**Fix:**
1. Check Metro bundler is running
2. Check for JavaScript errors in Metro console
3. Try reloading: Press `r` in Metro terminal or shake device → Reload

### Issue: "Cannot read property of undefined"

**Fix:**
- Check Metro console for the exact error
- Usually means a module isn't imported correctly
- Check all imports in the file mentioned in the error

## Step-by-Step Debug Process

### Step 1: Start Metro Bundler

```bash
cd "/Users/rahulboggaram/GoldApp"
npm start
```

**Expected output:**
```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Step 2: Run the App

**Option A: Using Expo CLI (Recommended)**
```bash
# In a new terminal
npx expo run:ios
```

**Option B: Using Xcode**
```bash
open ios/Spot.xcworkspace
# Then press Cmd+R to run
```

### Step 3: Check Logs

**Metro Bundler Terminal:**
- Look for bundle progress
- Check for errors (red text)

**Xcode Console:**
- Look for native crashes
- Check for JavaScript errors

**Device/Simulator:**
- Check if app appears
- Check for error screens

## Getting More Information

### Enable Verbose Logging

In Metro bundler, you'll see logs automatically. For more detail:

```bash
# Start with verbose logging
npm start -- --verbose
```

### Check App Logs

**iOS Simulator:**
```bash
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Spot"'
```

**iOS Device:**
- Connect device
- Open Xcode → Window → Devices and Simulators
- Select your device
- Click "Open Console"

## Still Not Working?

1. **Share the exact error message** from:
   - Metro bundler terminal
   - Xcode console
   - Device logs

2. **Check these files:**
   - `package.json` - Are all dependencies installed?
   - `app.json` - Is configuration correct?
   - `ios/Podfile` - Are pods installed?

3. **Try a clean rebuild:**
   ```bash
   # Clean everything
   rm -rf node_modules ios/build ios/Pods
   npm install
   cd ios && pod install && cd ..
   npx expo start --clear
   ```

## Quick Test

To verify everything is set up correctly:

```bash
# 1. Start Metro
npm start

# 2. In another terminal, run iOS
npx expo run:ios

# 3. Check if app loads
```

If the app still doesn't load, share:
- The **exact error message** from Metro bundler
- The **exact error message** from Xcode console
- What **screen/state** the app is in (white screen, black screen, crash, etc.)
