import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Platform, Text, View } from 'react-native';

interface MetalPriceCardProps {
  title: string;
  subtitle: string;
  basePrice: number | null;
  priceChange: { direction: string | null; difference: number; percentage: number } | null;
  colors: any;
  priceMultiplier?: number;
  isLoading?: boolean;
}

export function MetalPriceCard({ title, subtitle, basePrice, priceChange, colors, priceMultiplier = 1, isLoading = false }: MetalPriceCardProps) {
  // Show loading state if price is null/undefined or explicitly loading
  const isPriceLoading = isLoading || basePrice === null || basePrice === undefined;
  const displayPrice = isPriceLoading ? 0 : Math.round(basePrice * priceMultiplier);
  const purityMultipliers = [0.916, 0.833, 0.750];
  const purityLabels = ['22K', '20K', '18K']; // Will be split: "22" + " K" with 2px space
  const webFontWeight = (weight: string) => (Platform.OS === 'web' ? ({ fontWeight: weight } as const) : ({} as const));
  // Helper to get Inter font based on weight
  // React Native doesn't support variable fonts well, so we use separate font files per weight
  const getFontFamily = (weight: number = 400) => {
    if (Platform.OS === 'web') {
      return "'Inter', sans-serif";
    }
    
    // Map font weights to specific font family names (static fonts)
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

  return (
    <View style={{
      width: '100%',
      ...(Platform.OS === 'web' && {
        maxWidth: 400,
        alignSelf: 'center',
      }),
    }}>
      {/* Gold Bar Image - only for Gold card, outside the card */}
      {title === 'Gold' && (
        <View style={{ alignItems: 'center', marginBottom: -1 }}>
          <Image
            source={require('@/assets/images/gold-bar-top.png')}
            style={{ width: 310, height: 24 }}
            contentFit="contain"
          />
        </View>
      )}
      
      {/* Silver Bar Image - only for Silver card, outside the card */}
      {title === 'Silver' && (
        <View style={{ alignItems: 'center', marginBottom: -1 }}>
          <Image
            source={require('@/assets/images/silver-bar-top.png')}
            style={{ width: 310, height: 24 }}
            contentFit="contain"
          />
        </View>
      )}
      
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 32,
        marginTop: (title === 'Gold' || title === 'Silver') ? 0 : undefined,
        marginBottom: 24,
        width: '100%',
        ...(Platform.OS === 'web' && {
          maxWidth: 400,
        }),
      }}>
        
        {/* CONTENT BLOCK */}
        <View style={{ justifyContent: 'center' }}>
          
          {/* HEADER SECTION */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, color: '#000000', fontFamily: getFontFamily(600), letterSpacing: -0.02, ...webFontWeight('600') }}>
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {subtitle === '1g' ? (
                <>
                  <Text style={{ fontSize: 13, color: '#000000', fontFamily: getFontFamily(600), letterSpacing: -0.02, ...webFontWeight('600') }}>1</Text>
                  <View style={{ width: 1 }} />
                  <Text style={{ fontSize: 13, color: '#000000', fontFamily: getFontFamily(600), letterSpacing: -0.02, ...webFontWeight('600') }}>g</Text>
                </>
              ) : subtitle === '1kg' ? (
                <>
                  <Text style={{ fontSize: 13, color: '#000000', fontFamily: getFontFamily(600), letterSpacing: -0.02, ...webFontWeight('600') }}>1</Text>
                  <View style={{ width: 1 }} />
                  <Text style={{ fontSize: 13, color: '#000000', fontFamily: getFontFamily(600), letterSpacing: -0.02, ...webFontWeight('600') }}>kg</Text>
                </>
              ) : (
                <Text style={{ fontSize: 13, color: '#000000', fontFamily: getFontFamily(600), letterSpacing: -0.02, ...webFontWeight('600') }}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            {isPriceLoading ? (
              <View style={{ alignItems: 'flex-end', width: '100%' }}>
                <View style={{ 
                  width: 120, 
                  height: 34, 
                  backgroundColor: 'rgba(0,0,0,0.05)', 
                  borderRadius: 4,
                  marginBottom: 6
                }} />
                <View style={{ 
                  width: 80, 
                  height: 16, 
                  backgroundColor: 'rgba(0,0,0,0.05)', 
                  borderRadius: 4
                }} />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <Text style={{ fontSize: 22, fontFamily: getFontFamily(400), color: '#000000', letterSpacing: -0.02, ...webFontWeight('400') }}>₹</Text>
                  <Text style={{ fontSize: 22, fontFamily: getFontFamily(600), color: '#000000', letterSpacing: -0.02, ...webFontWeight('600') }}>{displayPrice.toLocaleString('en-IN')}</Text>
                </View>
                
                {/* Price indicator - aligned with subtitle */}
                {priceChange && priceChange.direction ? (
                  <View style={{ 
                    marginTop: 8, 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: priceChange.direction === 'up' 
                        ? '#4CAF50' 
                        : '#F44336',
                    }}>
                      {priceChange.direction === 'up' ? '↗' : '↘'}
                    </Text>
                    <Text style={{ 
                      fontSize: 13, 
                      fontFamily: getFontFamily(600),
                      color: priceChange.direction === 'up' 
                        ? '#4CAF50' 
                        : '#F44336',
                      letterSpacing: -0.02,
                      ...webFontWeight('600'),
                    }}>
                      {Math.round(Math.abs(priceChange.difference))}
                    </Text>
                  </View>
                ) : (
                  <View style={{ height: 18, marginTop: 8 }} />
                )}
              </>
            )}
          </View>
        </View>

        {/* Separator between 24K and other purities */}
        <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginTop: 0, marginBottom: 24 }} />

        {/* PURITY LIST - Tighter spacing for a unified look */}
        <View style={{ gap: 24 }}>
          {purityLabels.map((label, index) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <Text style={{ fontSize: 15, color: 'rgba(0,0,0,0.35)', fontFamily: getFontFamily(500), letterSpacing: -0.02, ...webFontWeight('500') }}>
                  {label.replace('K', '')}
                </Text>
                <Text style={{ fontSize: 15, color: 'rgba(0,0,0,0.35)', fontFamily: getFontFamily(500), letterSpacing: -0.02, ...webFontWeight('500') }}>
                  K
                </Text>
              </View>
              {isPriceLoading ? (
                <View style={{ width: 60, height: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 }} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: getFontFamily(400), color: 'rgba(0,0,0,0.35)', letterSpacing: -0.02, ...webFontWeight('400') }}>₹</Text>
                  <Text style={{ fontSize: 15, fontFamily: getFontFamily(500), color: 'rgba(0,0,0,0.35)', letterSpacing: -0.02, ...webFontWeight('500') }}>
                    {Math.round(displayPrice * purityMultipliers[index]).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        </View>
      </View>
    </View>
  );
}
