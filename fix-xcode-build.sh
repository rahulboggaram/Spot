#!/bin/bash

# Fix Xcode Build Issues Script
# This script cleans and rebuilds the iOS project to fix build errors

set -e

echo "🧹 Cleaning Xcode build artifacts..."

# 1. Clean Xcode Derived Data
echo "   → Cleaning Xcode Derived Data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/Spot-*

# 2. Clean iOS build folders
echo "   → Cleaning iOS build folders..."
cd "$(dirname "$0")"
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ios/*.xcworkspace/xcuserdata
rm -rf ios/*.xcodeproj/xcuserdata
rm -rf ios/*.xcodeproj/project.xcworkspace/xcuserdata

# 3. Clean node_modules and reinstall
echo "   → Cleaning and reinstalling node_modules..."
rm -rf node_modules
npm install

# 4. Clean Expo cache
echo "   → Cleaning Expo cache..."
rm -rf .expo
npx expo start --clear || true

# 5. Reinstall pods
echo "   → Reinstalling CocoaPods..."
cd ios
pod deintegrate || true
pod install
cd ..

echo ""
echo "✅ Clean complete!"
echo ""
echo "Next steps:"
echo "1. Open Xcode: open ios/Spot.xcworkspace"
echo "2. Product → Clean Build Folder (Shift+Cmd+K)"
echo "3. Product → Build (Cmd+B)"
echo ""
echo "Or run: npx expo run:ios"
