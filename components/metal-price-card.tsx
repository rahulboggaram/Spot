import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Text, View, Platform } from 'react-native';

export function MetalPriceCard({ title, subtitle, basePrice, priceChange, imageSource, colors, priceMultiplier = 1, isLoading = false }) {
  // Show loading state if price is null/undefined or explicitly loading
  const isPriceLoading = isLoading || basePrice === null || basePrice === undefined;
  const displayPrice = isPriceLoading ? 0 : Math.round(basePrice * priceMultiplier);
  const purityMultipliers = [0.916, 0.833, 0.750];
  const purityLabels = ['22K', '20K', '18K'];
  // Helper to get Google Sans Flex font based on weight
  // React Native doesn't support variable fonts well, so we use separate font files per weight
  const getFontFamily = (weight: number = 400) => {
    if (Platform.OS === 'web') {
      return "'Google Sans Flex', sans-serif";
    }
    
    // Map font weights to specific font family names (static fonts)
    const weightMap: { [key: number]: string } = {
      400: 'GoogleSansFlex-Regular',
      500: 'GoogleSansFlex-Medium',
      600: 'GoogleSansFlex-SemiBold',
      700: 'GoogleSansFlex-Bold',
      800: 'GoogleSansFlex-ExtraBold',
      900: 'GoogleSansFlex-Black',
    };
    
    return weightMap[weight] || 'GoogleSansFlex-Regular';
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 32,
      padding: 24,
      marginBottom: 16,
      shadowColor: 'rgba(32, 41, 76, 0.12)',
      shadowOffset: { width: 0, height: 9 },
      shadowOpacity: 1,
      shadowRadius: 25,
      elevation: 8,
      flexDirection: 'row',
      alignItems: 'center', // Centers the gold bar vertically against the text block
      ...(Platform.OS === 'web' && {
        width: 400,
        alignSelf: 'center',
      }),
    }}>
      
      {/* LEFT: ICON - Perfectly sized to match text block height */}
      <View style={{ width: 85, height: 160, marginRight: 24 }}>
        <Image 
          source={imageSource} 
          style={{ width: '100%', height: '100%' }} 
          contentFit="contain" 
        />
      </View>

      {/* RIGHT: CONTENT BLOCK */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        
        {/* HEADER SECTION */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 600, color: '#000', fontFamily: getFontFamily(600) }}>
              {title}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontWeight: 500, fontFamily: getFontFamily(500), marginTop: 4 }}>
              {subtitle}
            </Text>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            {isPriceLoading ? (
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ 
                  width: 100, 
                  height: 24, 
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
                <Text style={{ fontSize: 20, color: '#000' }}>
                  <Text style={{ fontWeight: 400, fontFamily: getFontFamily(400), marginRight: 2 }}>₹</Text>
                  <Text style={{ fontWeight: 600, fontFamily: getFontFamily(600) }}>{displayPrice.toLocaleString('en-IN')}</Text>
                </Text>
                
                {/* Price indicator - only show if we have price change data */}
                {priceChange && (
                  <View style={{ 
                    backgroundColor: priceChange.direction === 'up' 
                      ? 'rgba(76, 175, 80, 0.1)'   // Green for up
                      : priceChange.direction === 'down' 
                      ? 'rgba(244, 67, 54, 0.1)'    // Red for down
                      : 'rgba(128, 128, 128, 0.1)', // Grey for no change
                    paddingHorizontal: 8, 
                    paddingVertical: 3, 
                    borderRadius: 4, 
                    marginTop: 6, 
                    flexDirection: 'row', 
                    alignItems: 'center' 
                  }}>
                    {priceChange.direction && (
                      <Ionicons 
                        name={priceChange.direction === 'up' ? 'caret-up' : 'caret-down'} 
                        size={12} 
                        color={priceChange.direction === 'up' ? '#4CAF50' : '#F44336'} 
                      />
                    )}
                    <Text style={{ 
                      fontSize: 11, 
                      color: priceChange.direction === 'up' 
                        ? '#4CAF50' 
                        : priceChange.direction === 'down' 
                        ? '#F44336' 
                        : '#808080', // Grey for no change
                      marginLeft: priceChange.direction ? 2 : 0,
                    }}>
                      {priceChange.difference === 0 
                        ? 'No change' 
                        : (
                          <>
                            <Text style={{ fontWeight: 400, fontFamily: getFontFamily(400), marginRight: 2 }}>₹</Text>
                            <Text style={{ fontWeight: 400, fontFamily: getFontFamily(400) }}>
                              {priceChange.difference.toLocaleString('en-IN', { maximumFractionDigits: priceChange.difference % 1 === 0 ? 0 : 1 })}
                            </Text>
                          </>
                        )
                      }
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* PURITY LIST - Tighter spacing for a unified look */}
        <View style={{ gap: 12 }}>
          {purityLabels.map((label, index) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: 'rgba(0,0,0,0.35)', fontWeight: 500, fontFamily: getFontFamily(500) }}>
                {label}
              </Text>
              {isPriceLoading ? (
                <View style={{ width: 60, height: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 }} />
              ) : (
                <Text style={{ fontSize: 15, color: 'rgba(0,0,0,0.35)', fontWeight: 500, fontFamily: getFontFamily(500) }}>
                  <Text style={{ fontWeight: 400, fontFamily: getFontFamily(400), marginRight: 2 }}>₹</Text>
                  <Text style={{ fontWeight: 500, fontFamily: getFontFamily(500) }}>
                    {Math.round(displayPrice * purityMultipliers[index]).toLocaleString('en-IN')}
                  </Text>
                </Text>
              )}
            </View>
          ))}
        </View>

      </View>
    </View>
  );
}
