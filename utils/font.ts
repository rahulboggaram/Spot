import { Platform } from 'react-native';

type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;

const WEIGHT_MAP: Record<FontWeight, string> = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
  800: 'Inter-ExtraBold',
  900: 'Inter-Black',
};

/**
 * Returns the correct font family string for the current platform.
 * On web, uses the CSS font stack. On native, maps weight to a loaded font file.
 */
export const getFontFamily = (weight: FontWeight = 400): string => {
  if (Platform.OS === 'web') {
    return "'Inter', sans-serif";
  }
  return WEIGHT_MAP[weight] ?? 'Inter-Regular';
};
