import { Platform } from 'react-native';
import { useFonts } from 'expo-font';

/**
 * Hook to load Inter fonts and provide font family helper
 * Ensures fonts are loaded before rendering on all platforms
 */
export function useInterFont() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
  });

  const getFontFamily = (weight: number = 400) => {
    if (Platform.OS === 'web') {
      return "'Inter', sans-serif";
    }
    
    // Map font weights to specific font family names (static fonts)
    // Font names must match exactly with what was registered in useFonts
    const weightMap: { [key: number]: string } = {
      400: 'Inter-Regular',
      500: 'Inter-Medium',
      600: 'Inter-SemiBold',
      700: 'Inter-Bold',
      800: 'Inter-ExtraBold',
      900: 'Inter-Black',
    };
    
    const fontName = weightMap[weight] || 'Inter-Regular';
    
    // If fonts aren't loaded yet, return the font name anyway
    // React Native will fallback to system font if the font isn't available
    // This ensures the app doesn't break while fonts are loading
    return fontName;
  };

  return {
    fontsLoaded,
    fontError,
    getFontFamily,
  };
}
