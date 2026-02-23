import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Font from 'expo-font';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { InterFontFeatures } from '@/components/inter-font-features';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  // Load Inter static font files (one file per weight)
  // Variable fonts don't work reliably in React Native, so we need separate files
  // For Expo Go: Font names should match the file names (without .ttf extension)
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
  });
  
  // Alternative loading method as fallback (for Expo Go)
  const [fontsLoadedAsync, setFontsLoadedAsync] = useState(false);
  
  useEffect(() => {
    // Try alternative loading method if useFonts fails
    if (fontError && Platform.OS !== 'web') {
      console.log('⚠️ useFonts failed, trying Font.loadAsync as fallback...');
      Font.loadAsync({
        'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
        'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
        'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
        'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
        'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
        'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
      })
        .then(() => {
          console.log('✅ Font.loadAsync succeeded');
          setFontsLoadedAsync(true);
        })
        .catch((err) => {
          console.error('❌ Font.loadAsync also failed:', err);
        });
    }
  }, [fontError]);
  
  // Log font loading status for debugging (especially important for Expo Go)
  useEffect(() => {
    if (fontError) {
      console.error('❌ Font loading error:', fontError);
      console.error('❌ Error details:', JSON.stringify(fontError, null, 2));
    }
    if (fontsLoaded || fontsLoadedAsync) {
      console.log('✅ All Inter fonts loaded successfully');
      console.log('📱 Platform:', Platform.OS);
      console.log('📝 Registered font names:', [
        'Inter-Regular',
        'Inter-Medium',
        'Inter-SemiBold',
        'Inter-Bold',
        'Inter-ExtraBold',
        'Inter-Black',
      ]);
      console.log('🔍 Font loading method:', fontsLoaded ? 'useFonts' : 'Font.loadAsync');
    }
  }, [fontsLoaded, fontError, fontsLoadedAsync]);

  useEffect(() => {
    const allFontsLoaded = fontsLoaded || fontsLoadedAsync;
    if (allFontsLoaded || fontError) {
      // Hide the splash screen once fonts are loaded (or if there's an error)
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsLoadedAsync, fontError]);

  // Don't render until fonts are loaded (or if there's an error, render anyway with fallback fonts)
  const allFontsLoaded = fontsLoaded || fontsLoadedAsync;
  if (!allFontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <InterFontFeatures />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="price-history" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
