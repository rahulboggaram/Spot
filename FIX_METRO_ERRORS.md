# Fix Metro Module Resolution Errors

## Current Error
`Unable to resolve module @babel/runtime/helpers/wrapNativeSuper`

## Quick Fix

### Step 1: Stop Metro Bundler
Press `Ctrl+C` in the Metro terminal to stop it.

### Step 2: Clear All Caches
```bash
cd "/Users/rahulboggaram/GoldApp"
rm -rf node_modules/.cache .expo .metro
```

### Step 3: Reinstall Dependencies
```bash
npm install
```

### Step 4: Restart Metro with Clear Cache
```bash
npx expo start --clear
```

### Step 5: Reload App
- In simulator: Press `⌘R` (Cmd+R) to reload
- Or shake device → Reload

---

## If Still Not Working

### Nuclear Option: Complete Reset

```bash
cd "/Users/rahulboggaram/GoldApp"

# Remove all caches and build artifacts
rm -rf node_modules/.cache .expo .metro
rm -rf node_modules
rm -rf ios/build ios/Pods ios/Podfile.lock

# Reinstall everything
npm install
cd ios && pod install && cd ..

# Start fresh
npx expo start --clear
```

Then run the app:
```bash
npx expo run:ios
```

---

## Why This Happens

Metro bundler caches module resolutions. When dependencies are added or updated, the cache can become stale and Metro can't find modules that are actually installed.

The `--clear` flag forces Metro to rebuild its cache from scratch.

---

## Dependencies Added

I've added these to `package.json` to ensure they're available:
- `fbjs@^3.0.5` - For React Native Web
- `@babel/runtime@^7.25.0` - For Babel helpers

These should now be properly resolved by Metro.
