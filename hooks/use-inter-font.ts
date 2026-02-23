import { getFontFamily } from '@/utils/font';
import { useFonts } from 'expo-font';

/**
 * Hook to load Inter fonts.
 * For the getFontFamily helper, import directly from @/utils/font.
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

  return {
    fontsLoaded,
    fontError,
    getFontFamily,
  };
}
