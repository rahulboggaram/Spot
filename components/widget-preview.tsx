import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface WidgetPreviewProps {
  goldPrice: string;
  silverPrice: string;
  goldChangeDiff: number;
  silverChangeDiff: number;
  goldChangeDirection: 'up' | 'down' | null;
  silverChangeDirection: 'up' | 'down' | null;
  isLoading?: boolean;
}

// Helper to get font family (matching index.tsx)
const getFontFamily = (weight: number = 400) => {
  if (Platform.OS === 'web') {
    return "'Inter', sans-serif";
  }
  
  const weightMap: { [key: number]: string } = {
    400: 'Inter-Regular',
    500: 'Inter-Medium',
    600: 'Inter-SemiBold',
    700: 'Inter-Bold',
    800: 'Inter-ExtraBold',
    900: 'Inter-Black',
  };
  
  return weightMap[weight] || 'Inter-Regular';
};

// Helper to extract price without ₹ symbol
const priceWithoutRupee = (price: string): string => {
  if (!price || price === 'Connect App' || price === '—') {
    return price;
  }
  return price.replace(/[₹\s]/g, '').trim();
};

export function WidgetPreview({
  goldPrice = '',
  silverPrice = '',
  goldChangeDiff = 0,
  silverChangeDiff = 0,
  goldChangeDirection = null,
  silverChangeDirection = null,
  isLoading = false,
}: WidgetPreviewProps) {
  // Price indicator component (matching Swift indicator function)
  const PriceIndicator = ({ direction, diff, size = 'small' }: { direction: 'up' | 'down' | null; diff: number; size?: 'small' | 'medium' }) => {
    if (!direction || diff === 0) return null;
    
    const isUp = direction === 'up';
    const color = isUp ? '#4CAF50' : '#F44336'; // Exact colors from Swift: #4CAF50 (up) and #F44336 (down)
    const arrow = isUp ? '↗' : '↘'; // Matching Swift arrow symbols
    
    const arrowSize = size === 'medium' ? 12 : 12;
    const valueSize = size === 'medium' ? 13 : 13;
    
    return (
      <View style={styles.indicatorContainer}>
        <Text style={[styles.indicatorArrow, { color, fontSize: arrowSize }]}>{arrow}</Text>
        <Text style={[styles.indicatorValue, { color, fontSize: valueSize }]}>{Math.round(diff)}</Text>
      </View>
    );
  };

  // Format price display with ₹ symbol and 1px spacing
  const PriceDisplay = ({ price, size = 'small' }: { price: string; size?: 'small' | 'medium' }) => {
    const priceText = priceWithoutRupee(price) || '0';
    const isPlaceholder = !price || price === 'Connect App' || price === '—' || price === '';
    const fontSize = size === 'medium' ? 16 : 20;
    const fontWeight = size === 'medium' ? 600 : 700; // Medium: semibold (600), Small: bold (700)
    
    return (
      <View style={styles.priceContainer}>
        <Text style={[
          styles.rupeeSymbol, 
          isPlaceholder && styles.placeholderText,
          { 
            fontSize: size === 'medium' ? 16 : 20,
            fontFamily: getFontFamily(size === 'medium' ? 600 : 700)
          }
        ]}>₹</Text>
        <Text style={[
          styles.priceText, 
          isPlaceholder && styles.placeholderText,
          { 
            fontSize, 
            fontFamily: getFontFamily(fontWeight),
            fontWeight: Platform.OS === 'web' ? fontWeight : undefined
          }
        ]}>{priceText || '—'}</Text>
      </View>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.widgetsContainer}>
        <View style={styles.widgetWrapper}>
          <Text style={styles.widgetLabel}>Small Widget</Text>
          <View style={styles.widgetContainer}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.widgetsContainer}>
      {/* Small Widget */}
      <View style={styles.widgetWrapper}>
        <Text style={styles.widgetLabel}>Small Widget</Text>
        <View style={styles.widgetContainer}>
          {/* iOS WIDGET RULES APPLIED:
          ✅ .containerBackground(for: .widget) - White background (iOS 17+ requirement)
          ✅ .padding(.vertical, 12) - Vertical padding only, NO horizontal padding
          ✅ iOS automatically applies system margins (~16pt on ALL sides) - shown as safe area guides
          ✅ .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center) - Full frame, center aligned
          ✅ VStack(spacing: 0) with manual padding on sections
          ⚠️ iOS 17+ uses content margins system (not traditional safe area insets)
          */}
          
          {/* Safe Area Guides (iOS System Margins on ALL sides) - Visual indicators only */}
          <View style={styles.safeAreaGuide} pointerEvents="none">
            {/* Top safe area */}
            <View style={styles.safeAreaTop} />
            {/* Bottom safe area */}
            <View style={styles.safeAreaBottom} />
            {/* Left safe area */}
            <View style={styles.safeAreaLeft} />
            {/* Right safe area */}
            <View style={styles.safeAreaRight} />
          </View>
          
          <View style={styles.widgetContent}>
            {/* Gold Section */}
            <View style={[styles.section, styles.goldSection]}>
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  <View style={styles.goldDot} />
                  <Text style={styles.title}>Gold </Text>
                  <Text style={styles.title}>1</Text>
                  <View style={{ width: 1 }} />
                  <Text style={styles.title}>g</Text>
                </View>
                <PriceIndicator direction={goldChangeDirection} diff={goldChangeDiff} />
              </View>
              <View style={styles.priceRow}>
                <PriceDisplay price={goldPrice} />
              </View>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Silver Section */}
            <View style={[styles.section, styles.silverSection]}>
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  <View style={styles.silverDot} />
                  <Text style={styles.title}>Silver 1kg</Text>
                </View>
                <PriceIndicator direction={silverChangeDirection} diff={silverChangeDiff} />
              </View>
              <View style={styles.priceRow}>
                <PriceDisplay price={silverPrice} />
              </View>
            </View>
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  widgetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    ...(Platform.OS === 'web' ? { gap: 24 } : {}),
  },
  widgetWrapper: {
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS !== 'web' && { marginRight: 24 }),
  },
  widgetLabel: {
    fontSize: 12,
    fontFamily: getFontFamily(500),
    fontWeight: Platform.OS === 'web' ? 500 : undefined,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%', // Will be constrained by parent widget width
  },
  widgetContainer: {
    width: 158, // Small widget size: 158x158 points (iPhone 17 Pro)
    height: 158,
    backgroundColor: '#000000', // Black background
    borderRadius: 16, // Standard iOS widget corner radius
    overflow: 'hidden',
    position: 'relative', // For safe area guides
    // Add shadow for web preview to make it look like a widget
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  // Safe Area Guides - Visual indicators showing iOS system margins (~16pt on ALL sides)
  safeAreaGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  safeAreaTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16, // ✅ iOS system margin (~16pt) - Top safe area
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red tint for visibility (dev only)
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 0, 0, 0.3)',
  },
  safeAreaBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 16, // ✅ iOS system margin (~16pt) - Bottom safe area
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red tint for visibility (dev only)
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 0, 0, 0.3)',
  },
  safeAreaLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 16, // ✅ iOS system margin (~16pt) - Left safe area
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red tint for visibility (dev only)
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 0, 0, 0.3)',
  },
  safeAreaRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 16, // ✅ iOS system margin (~16pt) - Right safe area
    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red tint for visibility (dev only)
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 0, 0, 0.3)',
  },
  widgetContent: {
    flex: 1,
    paddingVertical: 12, // ✅ iOS Rule: .padding(.vertical, 12) - Manual vertical padding INSIDE safe area
    paddingHorizontal: 16, // ⚠️ iOS System Margin: ~16pt automatically applied by iOS on ALL sides (top, bottom, left, right)
    justifyContent: 'center', // ✅ iOS Rule: .frame(alignment: .center) - Vertically center the content
    // Note: Structure: Widget Container → iOS System Margins (~16pt all sides) → Content Area → Manual Padding (12pt vertical)
    // iOS 17+ uses content margins system - margins are applied automatically by the system around the entire content
    // The 16pt paddingHorizontal simulates iOS system margins (left/right)
    // The 12pt paddingVertical is the manual padding from Swift code (inside the safe area)
  },
  section: {
    // ✅ iOS Rule: VStack(spacing: 0) - No automatic spacing, manual padding used
  },
  goldSection: {
    paddingBottom: 20, // ✅ iOS Rule: .padding(.bottom, 20) - Space below Gold section
  },
  silverSection: {
    paddingTop: 20, // ✅ iOS Rule: .padding(.top, 20) - Space above Silver section
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4, // VStack spacing: 4 (matching Swift)
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700', // Golden color
    marginRight: 6,
  },
  silverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C0C0C0', // Silver color
    marginRight: 6,
  },
  priceRow: {
    // Container for price to maintain spacing
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: getFontFamily(500),
    color: '#FFFFFF',
  },
  title: {
    fontSize: 14, // 14pt medium (matching Swift)
    fontFamily: getFontFamily(500),
    fontWeight: Platform.OS === 'web' ? 500 : undefined,
    color: '#FFFFFF', // White
    letterSpacing: -0.02, // Matching app styling
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rupeeSymbol: {
    fontSize: 20, // 20pt bold (matching Swift)
    fontFamily: getFontFamily(700),
    fontWeight: Platform.OS === 'web' ? 700 : undefined,
    color: '#FFFFFF', // White
    letterSpacing: -0.02,
    marginRight: 1, // 1px spacing between ₹ and number (matching Swift HStack(spacing: 1))
  },
  priceText: {
    fontSize: 20, // 20pt bold (matching Swift)
    fontFamily: getFontFamily(700),
    fontWeight: Platform.OS === 'web' ? 700 : undefined,
    color: '#FFFFFF', // White
    letterSpacing: -0.02,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.4)', // White with opacity for placeholders
  },
  separator: {
    height: 1, // ✅ iOS Rule: Rectangle().frame(height: 1) - 1px separator
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // White with opacity for black background
    width: '100%', // ✅ iOS Rule: .frame(maxWidth: .infinity) - Full width
    // ✅ iOS Rule: No margin - spacing handled by section padding (.padding(.bottom, 20) and .padding(.top, 20))
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorArrow: {
    fontSize: 12, // 12pt medium (matching Swift)
    fontFamily: getFontFamily(500),
    fontWeight: Platform.OS === 'web' ? 500 : undefined,
    letterSpacing: -0.02,
    marginRight: 4, // 4px spacing (matching Swift HStack(spacing: 4))
  },
  indicatorValue: {
    fontSize: 13, // 13pt medium (matching Swift)
    fontFamily: getFontFamily(500),
    fontWeight: Platform.OS === 'web' ? 500 : undefined,
    letterSpacing: -0.02,
  },
});
