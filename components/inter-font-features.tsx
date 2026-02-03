import { Platform } from 'react-native';
import { useEffect } from 'react';

/**
 * Component to inject global CSS for Inter OpenType features on web ONLY
 * 
 * NOTE: This ONLY works on web. React Native/Expo Go does NOT support
 * custom OpenType features like stylistic sets or character variants.
 * This is a platform limitation.
 */
export function InterFontFeatures() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load Inter font from official source (rsms.me) for full OpenType feature support
      // This includes all stylistic sets and character variants
      const link = document.createElement('link');
      link.href = 'https://rsms.me/inter/inter.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      // Inject global CSS to enable all Inter OpenType features (WEB ONLY)
      // OpenType features enabled:
      // - liga: Standard ligatures (fi, fl, etc.)
      // - calt: Contextual alternates
      // - ss01-ss08: Stylistic sets (all disabled)
      // - cv01-cv13: Character variants (all enabled)
      // - zero: Slashed zero (disabled, using default)
      const style = document.createElement('style');
      style.textContent = `
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          font-feature-settings: "liga" 1, "calt" 1, "ss01" 0, "ss02" 0, "ss03" 0, "ss04" 0, "ss05" 0, "ss06" 0, "ss07" 0, "ss08" 0, "cv01" 1, "cv02" 1, "cv03" 1, "cv04" 1, "cv05" 1, "cv06" 1, "cv07" 1, "cv08" 1, "cv09" 1, "cv10" 1, "cv11" 1, "cv12" 1, "cv13" 1, "zero" 0 !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
