import { Platform } from 'react-native';

/**
 * Get OpenType font feature settings for Inter font
 * 
 * IMPORTANT: React Native (including Expo Go) does NOT support custom OpenType features
 * like stylistic sets (ss01-ss08) or character variants (cv01-cv13).
 * These only work on web via CSS font-feature-settings.
 * 
 * For web: Uses CSS font-feature-settings with all Inter features
 * For React Native: Only standard features via fontVariant prop (very limited)
 */
export const getInterFontFeatures = () => {
  if (Platform.OS === 'web') {
    // For web: Enable all Inter OpenType features via CSS
    // This enables:
    // - Ligatures (liga) and Contextual Alternates (calt)
    // - All Stylistic Sets: ss01-ss08 (alternate digits, disambiguation, rounded quotes, etc.)
    // - All Character Variants: cv01-cv13 (alternate 1, open 4/6/9, l with tail, single-story a, etc.)
    return {
      fontFeatureSettings: `"liga" 1, "calt" 1, "ss01" 1, "ss02" 0, "ss03" 1, "ss04" 1, "ss05" 1, "ss06" 1, "ss07" 1, "ss08" 1, "cv01" 1, "cv02" 1, "cv03" 1, "cv04" 1, "cv05" 1, "cv06" 1, "cv07" 1, "cv08" 1, "cv09" 1, "cv10" 1, "cv11" 1, "cv12" 1, "cv13" 1, "zero" 0`,
    } as any; // TypeScript workaround for web-only CSS property
  }
  
  // For React Native/Expo Go: VERY LIMITED support
  // React Native's fontVariant prop ONLY supports these standard features:
  // - 'small-caps', 'oldstyle-nums', 'lining-nums', 'tabular-nums', 'proportional-nums'
  // 
  // Custom OpenType features (ss01-ss08, cv01-cv13) are NOT supported in React Native.
  // This is a platform limitation - not something we can fix.
  // The Inter font will still work, just without the advanced OpenType features.
  return {
    fontVariant: ['lining-nums', 'proportional-nums'] as const,
  };
};
