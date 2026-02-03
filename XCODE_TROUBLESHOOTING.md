# Xcode Troubleshooting - React Native Runtime Error

## Issue: `com.facebook.react.runtime.JavaScript` Error

This error typically occurs when building/running the iOS app from Xcode.

## ✅ Solution 1: Start Metro Bundler First (Most Common Fix)

**The Problem:** Starting from React Native 0.73+, Metro bundler must be running before building from Xcode.

**The Fix:**

1. **Start Metro bundler first:**
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **Keep Metro running** in the terminal

3. **Then build from Xcode:**
   - Open Xcode
   - Build and run your project
   - Metro will serve the JavaScript bundle

**Alternative:** Use Expo CLI to run iOS:
```bash
npm run ios
# or
npx expo run:ios
```

This automatically starts Metro and launches the simulator.

---

## ✅ Solution 2: Clean Build and Reinstall Dependencies

If Solution 1 doesn't work:

```bash
# Clean build folders
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# Clean Expo cache
npx expo start --clear

# Reinstall pods (if using prebuild)
cd ios
pod install
cd ..
```

---

## ✅ Solution 3: Regenerate iOS Project

If you've made manual changes to the iOS project:

```bash
# Remove iOS folder
rm -rf ios

# Regenerate iOS project
npx expo prebuild --platform ios --clean

# Install pods
cd ios
pod install
cd ..

# Open in Xcode
open ios/Spot.xcworkspace
```

---

## ✅ Solution 4: Xcode 16 Compatibility Issue

If you're using Xcode 16, there's a known compatibility issue. Try:

1. **Use Xcode 15** (if available)
2. **Or update React Native/Expo** to latest versions:
   ```bash
   npx expo install --fix
   npm update
   ```

---

## ✅ Solution 5: Check Simulator Setup

1. **Open Xcode**
2. **Open Simulator** (Xcode → Open Developer Tool → Simulator)
3. **Launch a simulator** (e.g., iPhone 15)
4. **Then run:**
   ```bash
   npx expo run:ios
   ```

---

## ✅ Solution 6: Check Build Settings in Xcode

1. Open `ios/Spot.xcworkspace` in Xcode
2. Select your project in the navigator
3. Go to **Build Settings**
4. Search for "JavaScript"
5. Ensure **JavaScript Runtime** is set correctly
6. Clean build folder: **Product → Clean Build Folder** (Shift+Cmd+K)
7. Build again: **Product → Build** (Cmd+B)

---

## ✅ Solution 7: Check Info.plist

Ensure your `Info.plist` has the correct bundle identifier:

1. Open `ios/Spot/Info.plist` (or check in Xcode)
2. Verify `CFBundleIdentifier` matches `com.rahulboggaram.Spot`
3. Verify `CFBundleName` is set correctly

---

## 🔍 Debug Steps

### Check Metro Bundler Logs

When Metro is running, check the terminal for errors:
- Look for red error messages
- Check for missing dependencies
- Verify all packages are installed

### Check Xcode Console

1. In Xcode, open **View → Debug Area → Activate Console** (Shift+Cmd+C)
2. Run your app
3. Look for specific error messages
4. Share the full error message for better troubleshooting

### Check Device Logs

```bash
# View device logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Spot"'
```

---

## 🚀 Recommended Workflow

**For Development:**
```bash
# Always use Expo CLI (recommended)
npx expo start
# Then press 'i' for iOS simulator
```

**For Xcode Builds:**
```bash
# 1. Start Metro first
npm start

# 2. Keep Metro running, then build from Xcode
# Open ios/Spot.xcworkspace in Xcode
# Product → Run
```

---

## 📋 Quick Checklist

- [ ] Metro bundler is running (`npm start`)
- [ ] Simulator is open and running
- [ ] Xcode is using correct workspace (`.xcworkspace`, not `.xcodeproj`)
- [ ] Pods are installed (`cd ios && pod install`)
- [ ] Build folder is clean
- [ ] Bundle identifier matches `app.json`
- [ ] Using compatible Xcode version

---

## 🆘 Still Having Issues?

1. **Share the full error message** from Xcode console
2. **Check Expo version:**
   ```bash
   npx expo --version
   ```
3. **Check React Native version:**
   ```bash
   npm list react-native
   ```
4. **Check Xcode version:**
   ```bash
   xcodebuild -version
   ```

---

## 💡 Pro Tips

- **Always use `.xcworkspace`** (not `.xcodeproj`) when CocoaPods are involved
- **Keep Metro running** during development
- **Use `npx expo run:ios`** instead of building from Xcode directly
- **Clean build folder** if you see strange errors
