# Fix Xcode Build Errors (41 Issues)

## Quick Fix - Run This Script

```bash
cd "/Users/rahulboggaram/GoldApp"
./fix-xcode-build.sh
```

Then:
1. Open Xcode: `open ios/Spot.xcworkspace`
2. **Product → Clean Build Folder** (Shift+Cmd+K)
3. **Product → Build** (Cmd+B)

---

## Manual Fix Steps

If the script doesn't work, follow these steps:

### Step 1: Clean Xcode Derived Data

```bash
# Clean all derived data for this project
rm -rf ~/Library/Developer/Xcode/DerivedData/Spot-*
```

Or in Xcode:
- **Xcode → Settings → Locations**
- Click the arrow next to **Derived Data** path
- Delete the `Spot-*` folder

### Step 2: Clean iOS Build Artifacts

```bash
cd "/Users/rahulboggaram/GoldApp"
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
```

### Step 3: Clean Node Modules

```bash
rm -rf node_modules
npm install
```

### Step 4: Reinstall Pods

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Step 5: Clean Build in Xcode

1. Open `ios/Spot.xcworkspace` in Xcode
2. **Product → Clean Build Folder** (Shift+Cmd+K)
3. Close Xcode

### Step 6: Rebuild

```bash
npx expo run:ios
```

Or open Xcode and build from there.

---

## Common Error Fixes

### Error: `facebook::react::Sealable::Sealable() not found`

**This is a React Native linking issue. Fix:**

1. Clean derived data (Step 1 above)
2. Reinstall pods (Step 4 above)
3. In Xcode, check **Build Settings → Other Linker Flags**
   - Should include `-lc++` (but only once - the duplicate warning is OK)
   - Should NOT have `-framework SwiftUICore` (remove if present)

### Error: Module map file errors

**Fix:**
- Clean derived data (Step 1)
- Reinstall pods (Step 4)
- Clean build folder in Xcode

### Error: `Could not find or use auto-linked framework 'CoreAudioTypes'`

**This is usually a warning, not an error. Ignore it if build succeeds.**

If it causes build failure:
1. In Xcode → **Build Settings**
2. Search for "Other Linker Flags"
3. Remove any `-framework CoreAudioTypes` entries
4. Clean and rebuild

### Error: `cannot link directly with 'SwiftUICore'`

**Fix:**
1. In Xcode → **Build Settings**
2. Search for "Other Linker Flags"
3. Remove `-framework SwiftUICore` if present
4. Clean and rebuild

---

## If Still Failing

### Check Build Settings

1. Open `ios/Spot.xcworkspace` in Xcode
2. Select **Spot** target
3. Go to **Build Settings**
4. Search for:
   - **Other Linker Flags** - Should have `$(inherited)` and `-lc++`
   - **Header Search Paths** - Should include React Native paths
   - **Framework Search Paths** - Should include Pods paths

### Check Pod Installation

```bash
cd ios
pod install --verbose
```

Look for errors in the output.

### Check React Native Version

Your project uses:
- **React Native**: 0.81.5
- **Expo**: ~54.0.31

These should be compatible. If issues persist, try:

```bash
npx expo install --fix
```

---

## Nuclear Option (Complete Reset)

If nothing works:

```bash
cd "/Users/rahulboggaram/GoldApp"

# Remove all build artifacts
rm -rf ios/build ios/Pods ios/Podfile.lock
rm -rf node_modules
rm -rf ~/Library/Developer/Xcode/DerivedData/Spot-*

# Reinstall everything
npm install
cd ios && pod install && cd ..

# Regenerate iOS project
npx expo prebuild --platform ios --clean

# Reinstall pods again
cd ios && pod install && cd ..

# Try building
npx expo run:ios
```

---

## Still Having Issues?

Share:
1. **Full error message** from Xcode (copy from Issues navigator)
2. **Build log** (Xcode → View → Navigators → Reports → Latest build)
3. **Pod install output** (if any errors)
