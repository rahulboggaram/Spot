# Widget: Fix White Empty on Physical iPhone

If the widget works in Simulator but shows a **white empty container** on a real device, it’s usually due to:

1. **Widget crashing** during the first snapshot (e.g. bad access to shared UserDefaults)
2. **Missing permissions** to read the App Group (security stricter on device than Simulator)

The Swift code uses **guard-based “locker” access**: it reads only from `UserDefaults(suiteName:)` and returns **"Connect App"** when the locker is empty, so the widget never crashes and never shows a blank white screen.

---

## 1. Fix Build Configuration (Xcode)

App Groups are sometimes enabled only for **Release** or **Debug**, not both.

1. Open **Xcode** → select the **project** (blue icon) → **Targets** → **SpotWidgetExtension**
2. **Build Settings** → search **Development Team**
   - Set your team for **both** Debug and Release
3. Search **Code Signing Entitlements**
   - Ensure **both** Debug and Release point to your `.entitlements` file (e.g. `generated.entitlements`)

---

## 2. Suite Name Must Match

The widget uses:

```swift
UserDefaults(suiteName: "group.com.rahulboggaram.Spot.goldapp")
```

This **must** match:

- `APP_GROUP` in `app/index.tsx`
- `group.com.rahulboggaram.Spot.goldapp` in `generated.entitlements`
- App Groups capability for **both** the main app and **SpotWidgetExtension**

---

## 3. Physical Device Reset (When Changing App Group or Still White)

Simulators are looser with security; the device can cache old permissions.

1. **Delete the app** from your iPhone
2. **Restart the iPhone** (clears WidgetCenter cache)
3. In project root: `npx expo prebuild`
4. In Xcode: **Product → Clean Build Folder** (⌘⇧K), then **Product → Run** (⌘R) to your phone

---

## 4. App Group Registration (CRITICAL for Physical Device)

On a physical device, the App Group **must be registered** in your Apple Developer Portal.

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list) → **Certificates, Identifiers & Profiles** → **Identifiers**
2. Find your **App ID** (e.g., `com.rahulboggaram.Spot`)
3. Ensure **App Groups** capability is enabled
4. Create/verify the App Group identifier: `group.com.rahulboggaram.Spot.goldapp`
5. In **Xcode** → **Target (SpotWidgetExtension)** → **Signing & Capabilities**
   - If App Group shows a **red warning** or "Not available for this account", the widget will crash (white box)
   - Fix: Enable App Groups in Developer Portal, then refresh capabilities in Xcode

---

## 5. iOS 17+ / iOS 26 Requirements

**MANDATORY**: `.containerBackground(for: .widget)` is required for iOS 17+ / iOS 26.

- Without it, the widget shows a **white box** even with correct code
- The widget code now includes: `.containerBackground(for: .widget) { Color(UIColor.systemBackground) }`
- This provides proper background rendering and dark mode support

**Widget Sizes:**
- **Small (systemSmall)**: 158x158 points on iPhone 17 Pro
- Text uses `.minimumScaleFactor(0.5)` and `.lineLimit(1)` to prevent clipping

---

## 6. Rules Already Enforced in Code

- **No network**: Widget only reads from UserDefaults; no Supabase/API calls.
- **Explicit views**: Both `systemSmall` and `systemMedium` have defined views.
- **Guard-based fetch**: Empty locker → `"Connect App"` instead of crash or white screen.
- **containerBackground**: Required for iOS 17+ / iOS 26 (prevents white box).
- **System colors**: Uses `.primary`, `.secondary` for dark mode support.
