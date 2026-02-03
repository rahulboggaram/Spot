import { HistoricalPricesSheet } from '@/components/historical-prices-sheet';
import { MetalPriceCard } from '@/components/metal-price-card';
import { historicalPrices } from '@/data/historical-prices';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExtensionStorage } from "@bacons/apple-targets";
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { supabase } from '../../lib/supabase';

// Check if SharedGroupPreferences is available
const isSharedGroupPreferencesAvailable = () => {
  try {
    const isAvailable = SharedGroupPreferences && 
           typeof SharedGroupPreferences.setItem === 'function' &&
           typeof SharedGroupPreferences.getItem === 'function';
    
    // Log detailed info for debugging
    console.log('🔍 SharedGroupPreferences check:', {
      exists: !!SharedGroupPreferences,
      type: typeof SharedGroupPreferences,
      hasSetItem: SharedGroupPreferences && typeof SharedGroupPreferences.setItem === 'function',
      hasGetItem: SharedGroupPreferences && typeof SharedGroupPreferences.getItem === 'function',
      isAvailable
    });
    
    return isAvailable;
  } catch (e) {
    console.log('🔍 SharedGroupPreferences check error:', e);
    return false;
  }
};

const APP_GROUP = 'group.com.rahulboggaram.Spot';
// Helper function to get the correct font family based on platform and weight
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

export default function GoldApp() {
  // 🧪 TEST LOG - This should appear immediately when app opens
  console.log('🚀 ===== APP LOADED - LOGGING IS WORKING! =====');
  console.log('🚀 Current time:', new Date().toLocaleTimeString());
  
  const [data, setData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [previousPrices, setPreviousPrices] = useState<{ gold: number; silver: number } | null>(null);
  // Use ref to store previous price synchronously for immediate comparison
  const previousPricesRef = useRef<{ gold: number; silver: number } | null>(null);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'physical' | 'pcx'>('physical');
  const [isLoading, setIsLoading] = useState(true); // Track loading state
  const colorScheme = useColorScheme();
  const isDark = false; // Force light mode

  // Dynamic colors that invert based on mode
  const colors = {
    background: isDark ? '#000000' : '#F0F1F5', // Fold.money background color
    cardBackground: isDark ? 'rgba(18, 18, 18, 0.8)' : '#FFFFFF', // Fold.money white cards
    cardBackgroundLight: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.6)',
    cardBackgroundFooter: isDark ? 'rgba(18, 18, 18, 0.4)' : 'rgba(255, 255, 255, 0.4)',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    textTertiary: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    borderLight: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderSubtle: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    borderVerySubtle: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    iconBackground: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
    iconBackgroundDark: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    iconBorder: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    iconBorderDark: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    glassOverlay: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    statusBadgeBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    statusBadgeBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    statusBadgeBorderOpen: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    statusGlow: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
    divider: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    priceUp: '#4CAF50', // Green for price increase
    priceDown: '#F44336', // Red for price decrease
  };

  // Helper function to update widget with price (uses fallback if needed)
  const updateWidget = async (goldPrice?: number) => {
    try {
      // Check if SharedGroupPreferences is available (only on iOS)
      if (Platform.OS !== 'ios') {
        console.log('⚠️ Widget update skipped - not on iOS');
        return;
      }

      // Check if SharedGroupPreferences module is properly loaded
      if (!isSharedGroupPreferencesAvailable()) {
        console.log('⚠️ SharedGroupPreferences module not available or not properly linked');
        console.log('⚠️ SharedGroupPreferences value:', SharedGroupPreferences);
        console.log('⚠️ This usually means:');
        console.log('   1. Run "cd ios && pod install"');
        console.log('   2. Clean build folder in Xcode (Cmd+Shift+K)');
        console.log('   3. Rebuild the app');
        return;
      }

      // Use provided price, or fallback to historical data, or use a default
      let priceToUse = goldPrice;
      
      console.log('🔧 updateWidget called with goldPrice:', goldPrice);
      
      // If no price provided, try to get from historical data
      if (!priceToUse && historicalData.length > 0) {
        const latestEntry = historicalData[0];
        priceToUse = (latestEntry.gold_price_pm || latestEntry.goldPricePM) / 10; // Convert 10g to per gram
        console.log('🔧 Using historical database price:', priceToUse);
      }
      
      // If still no price, try static historical data
      if (!priceToUse && historicalPrices.length > 0) {
        priceToUse = historicalPrices[0].goldPricePM / 10;
        console.log('🔧 Using static historical price:', priceToUse);
      }
      
      // If we have a valid price, update the widget
      if (priceToUse && priceToUse > 0) {
        const roundedPrice = Math.round(priceToUse);
        const widgetPrice = `₹${roundedPrice.toLocaleString('en-IN')}`;
        console.log('🔧 Saving to widget - roundedPrice:', roundedPrice, 'formatted:', widgetPrice);
        
        try {
          // Save the price
          const saveResult = await SharedGroupPreferences.setItem('currentPrice', widgetPrice, APP_GROUP);
          console.log('✅ Price saved to SharedGroupPreferences, result:', saveResult);
          
          // Verify it was saved immediately
          try {
            const savedValue = await SharedGroupPreferences.getItem('currentPrice', APP_GROUP);
            console.log('🔧 Verified saved value:', savedValue);
            
            if (savedValue !== widgetPrice) {
              console.log('⚠️ WARNING: Saved value does not match! Expected:', widgetPrice, 'Got:', savedValue);
              // Try saving again
              await SharedGroupPreferences.setItem('currentPrice', widgetPrice, APP_GROUP);
              console.log('🔄 Retried saving price');
            }
          } catch (verifyError) {
            console.log('⚠️ Could not verify saved value:', verifyError);
          }
          
          // Force widget to reload immediately after saving
          if (ExtensionStorage && typeof ExtensionStorage.reloadWidget === 'function') {
            try {
              // Reload widget multiple times to ensure it updates
              ExtensionStorage.reloadWidget();
              setTimeout(() => {
                ExtensionStorage.reloadWidget();
                console.log('✅ Widget reloaded (second attempt)');
              }, 500);
              console.log('✅ Widget reloaded (first attempt)');
            } catch (reloadError) {
              console.log('⚠️ Widget reload failed:', reloadError);
            }
          } else {
            console.log('⚠️ ExtensionStorage.reloadWidget not available');
          }
          
          console.log('📊 Widget Updated Successfully:', widgetPrice);
          console.log('📊 Current app price:', goldPrice, 'Widget should show:', widgetPrice);
        } catch (saveError) {
          console.log('⚠️ Error saving to SharedGroupPreferences:', saveError);
          console.log('⚠️ Error details:', JSON.stringify(saveError));
          throw saveError;
        }
      } else {
        console.log('⚠️ No valid price available for widget. priceToUse:', priceToUse);
      }
    } catch (widgetError) {
      console.log('⚠️ Widget Update Failed:', widgetError);
    }
  };

  const fetchPrices = async () => {
    try {
      setIsLoading(true); // Set loading state when fetching
      // Get the two most recent entries: latest (current) and previous
      const { data: entries, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(2);
      
      if (error) throw error;
      
      if (!entries || entries.length === 0) {
        console.log('No price entries found');
        setIsLoading(false); // Stop loading even if no data
        // Update widget with fallback data even if no database entries
        await updateWidget();
        return;
      }
      
      const latestEntry = entries[0]; // Most recent entry
      const previousEntry = entries.length > 1 ? entries[1] : entries[0]; // Previous entry, or same if only one
      
      console.log('📊 Latest entry:', latestEntry);
      console.log('📊 Previous entry:', previousEntry);
      
      // Store previous prices from the previous entry (not current state)
      const oldPrice = {
        gold: previousEntry.gold_999_base || 0,
        silver: previousEntry.silver_base || 0,
      };
      
      console.log('📊 Storing previous prices from database:', oldPrice);
      console.log('📊 New prices from database:', { gold: latestEntry.gold_999_base, silver: latestEntry.silver_base });
      console.log('📊 About to update widget with gold_999_base:', latestEntry.gold_999_base);
      
      // Store in both state and ref for immediate access
      setPreviousPrices(oldPrice);
      previousPricesRef.current = oldPrice;
      
      // Update current data FIRST so useEffect can also update widget
      setData(latestEntry);
      setIsLoading(false); // Stop loading once we have data
      
      // Update widget with database price (ensure it's a valid number)
      const goldPriceForWidget = typeof latestEntry.gold_999_base === 'string' 
        ? parseFloat(latestEntry.gold_999_base) 
        : latestEntry.gold_999_base;
      
      if (goldPriceForWidget && !isNaN(goldPriceForWidget) && goldPriceForWidget > 0) {
        console.log('✅ Valid gold price found, updating widget:', goldPriceForWidget);
        // Update widget immediately with new price
        await updateWidget(goldPriceForWidget);
        console.log('✅ Widget update completed for new price');
      } else {
        console.log('⚠️ Invalid gold price for widget:', goldPriceForWidget, 'type:', typeof goldPriceForWidget);
        // Still try to update with fallback
        await updateWidget();
      }
    } catch (e) {
      console.error('Error fetching prices:', e);
      setIsLoading(false); // Stop loading on error
      // Update widget with fallback data even on error
      await updateWidget();
    }
  };
  
  // Don't initialize previousPrices on first load - let it be null so we can use historical data
  // previousPrices will only be set when fetchPrices detects a change (in the setData callback)

  const fetchHistoricalPrices = async () => {
    try {
      const { data: historical, error } = await supabase
        .from('historical_prices')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) {
        // This stops the crash/warning and just uses static data instead
        console.log('Note: historical_prices table not found, using static data');
        // Update widget with static historical data as fallback
        await updateWidget();
        return; 
      }
      
      if (historical && historical.length > 0) {
        setHistoricalData(historical);
        // Update widget with historical data (in case main prices haven't loaded yet)
        const latestEntry = historical[0];
        const goldPrice = (latestEntry.gold_price_pm || latestEntry.goldPricePM) / 10;
        await updateWidget(goldPrice);
      } else {
        // No historical data, try static fallback
        await updateWidget();
      }
    } catch (e) {
      console.log('Silent error in history:', e);
      // Update widget with static fallback even on error
      await updateWidget();
    }
  };

  useEffect(() => {
    console.log('🚀 ===== useEffect RUNNING - Starting data fetch =====');
    console.log('🚀 Static historical prices available:', historicalPrices.length, 'entries');
    
    // Immediately update widget with static data on app load (so it doesn't show "Loading...")
    if (historicalPrices.length > 0) {
      const initialPrice = historicalPrices[0].goldPricePM / 10;
      console.log('🚀 Initial widget update with static price:', initialPrice);
      updateWidget(initialPrice);
    }
    
    console.log('🚀 Calling fetchPrices()...');
    fetchPrices();
    console.log('🚀 Calling fetchHistoricalPrices()...');
    fetchHistoricalPrices();
    // Set up interval to fetch prices periodically (check every 30 seconds for faster updates)
    const interval = setInterval(() => {
      console.log('🔄 Periodic update - fetching prices again...');
      fetchPrices();
      fetchHistoricalPrices();
    }, 30000); // Fetch every 30 seconds for faster widget updates
    return () => clearInterval(interval);
  }, []);

  // Update widget when historical data becomes available (safety net)
  useEffect(() => {
    if (historicalData.length > 0 && !data) {
      // If we have historical data but no current data, update widget with historical
      const latestEntry = historicalData[0];
      const goldPrice = (latestEntry.gold_price_pm || latestEntry.goldPricePM) / 10;
      updateWidget(goldPrice);
    }
  }, [historicalData]);

  // Update widget whenever data changes (ensures widget always has latest price)
  useEffect(() => {
    if (data?.gold_999_base) {
      const goldPrice = typeof data.gold_999_base === 'string' 
        ? parseFloat(data.gold_999_base) 
        : data.gold_999_base;
      
      if (goldPrice && !isNaN(goldPrice) && goldPrice > 0) {
        console.log('🔄 Data changed, updating widget with new price:', goldPrice);
        console.log('🔄 Previous price in widget might be stale, forcing update...');
        // Force update widget when price changes
        updateWidget(goldPrice).then(() => {
          console.log('✅ Widget update completed from useEffect');
        }).catch(err => {
          console.log('⚠️ Widget update failed in useEffect:', err);
        });
      }
    }
  }, [data?.gold_999_base, data?.updated_at]); // Trigger when gold_999_base OR updated_at changes

  // Get latest historical prices from database or fallback to static file
  const getLatestHistoricalPrices = () => {
    // Prioritize database historical prices
    if (historicalData && historicalData.length > 0) {
      const latestEntry = historicalData[0]; // Most recent entry from database
      return {
        goldPerGram: (latestEntry.gold_price_pm || latestEntry.goldPricePM) / 10, // Convert 10g to per gram
        silverPerGram: (latestEntry.silver_price_pm || latestEntry.silverPricePM) / 1000, // Convert 1kg to per gram
      };
    }
    // Fallback to static historical prices
    if (!historicalPrices || historicalPrices.length === 0) return null;
    const latestEntry = historicalPrices[0];
    return {
      goldPerGram: latestEntry.goldPricePM / 10,
      silverPerGram: latestEntry.silverPricePM / 1000,
    };
  };

  const latestHistorical = getLatestHistoricalPrices();
  
  // Only show database prices (not historical fallback) to avoid showing random numbers
  // Show loading state if we don't have database data yet
  const goldBase = data?.gold_999_base || null; // null means loading, don't use fallback
  const silverBase = data?.silver_base || null; // null means loading, don't use fallback

  // Get last historical entry from static data as fallback
  const lastHistoricalEntry = historicalPrices.length > 0 ? {
    gold_price_pm: historicalPrices[0].goldPricePM, // Already in 10g rate
    silver_price_pm: historicalPrices[0].silverPricePM, // Already in 1kg rate
  } : null;

  // Simplified price change calculation: Only compare previous admin update with current admin update
  // Gold input is 10gms rate, Silver input is 1kg rate
  const getPriceChangeFromDatabase = () => {
    if (!data || isLoading) {
      // If no current data or still loading, return null so loading state shows
      return null;
    }
    
    // Get current prices from database (stored as per gram, convert to input units)
    const currentGold10g = (data.gold_999_base || 0) * 10; // Convert per gram to 10g rate
    const currentSilver1kg = (data.silver_base || 0) * 1000; // Convert per gram to 1kg rate
    
    // Get previous prices from ref (immediate access) or state (set when admin updates)
    // If not available, use current price (no change)
    const prevPrices = previousPricesRef.current || previousPrices;
    const previousGold10g = prevPrices?.gold ? prevPrices.gold * 10 : currentGold10g;
    const previousSilver1kg = prevPrices?.silver ? prevPrices.silver * 1000 : currentSilver1kg;
    
    console.log('🔍 Price Change Calculation:');
    console.log('  Previous Gold (10g):', previousGold10g, '(per gram:', previousGold10g / 10, ')');
    console.log('  Current Gold (10g):', currentGold10g, '(per gram:', currentGold10g / 10, ')');
    console.log('  Previous Silver (1kg):', previousSilver1kg);
    console.log('  Current Silver (1kg):', currentSilver1kg);
    console.log('  previousPrices state:', previousPrices);
    
    // Calculate differences
    const goldDifference10g = currentGold10g - previousGold10g;
    const silverDifference1kg = currentSilver1kg - previousSilver1kg;
    
    console.log('  Gold difference (10g):', goldDifference10g, '(per gram:', goldDifference10g / 10, ')');
    console.log('  Silver difference (1kg):', silverDifference1kg);
    
    // Gold: Convert difference to per gram for display
    const goldDifferencePerGram = Math.abs(goldDifference10g) / 10;
    const goldPercentage = previousGold10g > 0 ? (goldDifferencePerGram / previousGold10g) * 100 : 0;
    
    // Silver: Keep difference in 1kg units
    const silverDifference = Math.abs(silverDifference1kg);
    const silverPercentage = previousSilver1kg > 0 ? (silverDifference / previousSilver1kg) * 100 : 0;
    
    // Determine direction: up (green), down (red), or no change (grey/null)
    const goldDirection = goldDifference10g > 0 ? 'up' : goldDifference10g < 0 ? 'down' : null;
    const silverDirection = silverDifference1kg > 0 ? 'up' : silverDifference1kg < 0 ? 'down' : null;
    
    return {
      gold: {
        direction: goldDirection,
        difference: goldDifferencePerGram,
        percentage: goldPercentage,
      },
      silver: {
        direction: silverDirection,
        difference: silverDifference,
        percentage: silverPercentage,
      },
    };
  };

  // Get price change (returns null if loading or no data)
  const dbPriceChange = getPriceChangeFromDatabase();
  const goldChange = dbPriceChange?.gold || { direction: null, difference: 0, percentage: 0 };
  const silverChange = dbPriceChange?.silver || { direction: null, difference: 0, percentage: 0 };
  
  // Debug logging
  console.log('=== PRICE CHANGE DEBUG ===');
  console.log('dbPriceChange result:', dbPriceChange);
  console.log('Historical data length:', historicalData?.length || 0);
  console.log('Current data exists:', !!data);
  console.log('Current data:', data);
  console.log('Gold change:', goldChange);
  console.log('Silver change:', silverChange);
  console.log('Gold base:', goldBase);
  console.log('Silver base:', silverBase);
  
  // Force show indicator for testing if we have data
  if (data && !goldChange && !silverChange) {
    console.log('⚠️ WARNING: No price change calculated but we have data!');
  }

  // Get the latest price update date: Use database historical prices or database updated_at
  const getLatestUpdateDate = () => {
    // Prioritize database historical prices date
    if (historicalData && historicalData.length > 0) {
      const latestEntry = historicalData[0];
      const dateStr = latestEntry.date || latestEntry.created_at || latestEntry.updated_at;
      if (dateStr) {
        // If date is just a date string, add PM closing time
        if (dateStr.includes('T')) {
          return new Date(dateStr);
        } else {
          return new Date(dateStr + 'T17:00:00'); // PM closing time at 5:00 PM
        }
      }
    }
    // Fallback to database updated_at
    if (data?.updated_at) {
      return new Date(data.updated_at);
    }
    // Fallback to static historical data
    if (!historicalPrices || historicalPrices.length === 0) return null;
    const latestEntry = historicalPrices[0];
    return new Date(latestEntry.date + 'T17:00:00'); // PM closing time at 5:00 PM
  };

  const latestUpdateDate = getLatestUpdateDate();
  
  // Check if today is a weekend (Saturday or Sunday)
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const isTodayWeekend = todayDayOfWeek === 0 || todayDayOfWeek === 6;

  const dynamicStyles = createStyles(colors);

  return (
    <LinearGradient
      colors={['#F0F1F5', '#F0F1F5']}
      locations={[0, 1]}
      style={dynamicStyles.safeArea}
    >
      <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <View style={dynamicStyles.contentWrapper}>
            <ScrollView 
              contentContainerStyle={dynamicStyles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
          {activeTab === 'physical' ? (
            <>
              {/* TOP NAVIGATION BAR */}
              <View style={dynamicStyles.navBarWrapper}>
                <View style={dynamicStyles.navBar}>
                  <Image 
                    source={require('@/assets/images/spot-logo.png')} 
                    style={dynamicStyles.navLogo}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Date and Time Display Card */}
          <View style={dynamicStyles.dateTimeWrapper}>
            <View style={dynamicStyles.dateTimeCard}>
              {(() => {
                // Use latest update date from historical prices (last published date)
                // This will be the last trading day (not weekend)
                const updateDate = latestUpdateDate || new Date();
                
                const formattedDay = updateDate.toLocaleDateString('en-IN', { weekday: 'long' });
                const formattedDate = updateDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                // PM closing time is typically 5:00 PM (17:00)
                const formattedTime = updateDate.toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true
                }).toLowerCase();
                
                return (
                  <View style={dynamicStyles.dateTimeCardContent}>
                    <View style={dynamicStyles.dateTimeTextContainer}>
                      <Text style={[dynamicStyles.dateTimeText, { color: 'rgba(0, 0, 0, 0.4)', textAlign: 'center' }]}>
                        Price updated on
                      </Text>
                      <Text style={[dynamicStyles.dateTimeText, { color: 'rgba(0, 0, 0, 0.4)', textAlign: 'center' }]}>
                        {formattedDay} • {formattedDate} • {formattedTime}
                      </Text>
                      {isTodayWeekend && (
                        <Text style={[dynamicStyles.weekendNote, { color: colors.textTertiary, textAlign: 'center' }]}>
                          (Sat & Sun the rates are not published)
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
          {/* GOLD CARD */}
          <MetalPriceCard
            title="Gold"
            subtitle="per gram"
            basePrice={goldBase}
            priceChange={goldChange}
            imageSource={require('@/assets/images/gold-bar.png')}
            colors={colors}
            priceMultiplier={1}
            isLoading={isLoading || goldBase === null}
          />

          {/* SILVER CARD */}
          <MetalPriceCard
            title="Silver"
            subtitle="per kilo"
            basePrice={silverBase}
            priceChange={silverChange}
            imageSource={require('@/assets/images/silver-bar.png')}
            colors={colors}
            priceMultiplier={1000}
            isLoading={isLoading || silverBase === null}
          />

          {/* Historical Prices Button */}
          <TouchableOpacity 
            style={[dynamicStyles.historyButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => setShowHistorySheet(true)}
          >
            <Text style={[dynamicStyles.historyButtonText, { color: colors.text }]}>View Price History</Text>
          </TouchableOpacity>

          {/* Last Updated Footer */}
          <View style={dynamicStyles.footerCard}>
            <Text style={[dynamicStyles.lastUpdated, { color: colors.textTertiary }]}>
              Rates updated from Monday to Friday at 12.00pm & 5.00pm.
            </Text>
          </View>
            </>
          ) : (
            <>
              {/* PCX Content */}
              <View style={dynamicStyles.navBarWrapper}>
                <View style={dynamicStyles.navBar}>
                  <Image 
                    source={require('@/assets/images/spot-logo.png')} 
                    style={dynamicStyles.navLogo}
                    contentFit="contain"
                  />
                </View>
              </View>
              
              <View style={[
                dynamicStyles.largeCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 32 }
              ]}>
                <View style={[dynamicStyles.glassOverlay, { backgroundColor: colors.glassOverlay }]} />
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="trending-up-outline" size={48} color={colors.textTertiary} />
                  <Text style={[dynamicStyles.cardHeaderTitle, { color: colors.text, marginTop: 16 }]}>
                    PCX Data
                  </Text>
                  <Text style={[dynamicStyles.cardHeaderSubtitle, { color: colors.textTertiary, marginTop: 8 }]}>
                    Coming soon
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {/* Historical Prices Sheet */}
      <HistoricalPricesSheet
        visible={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        data={historicalData.length > 0 ? historicalData.map((item: any) => ({
          date: item.date || item.created_at?.split('T')[0] || '',
          goldPriceAM: item.gold_price_am || item.goldPriceAM || 0,
          goldPricePM: item.gold_price_pm || item.goldPricePM || 0,
          silverPriceAM: item.silver_price_am || item.silverPriceAM || 0,
          silverPricePM: item.silver_price_pm || item.silverPricePM || 0,
        })) : historicalPrices}
      />

      {/* Floating Bottom Navigation - Hidden until MCX prices are added */}
      {/* <View style={[
        dynamicStyles.bottomNav,
        { backgroundColor: colors.cardBackground }
      ]}>
        <View style={[dynamicStyles.glassOverlay, { backgroundColor: colors.glassOverlay }]} />
        
        <TouchableOpacity
          style={[
            dynamicStyles.bottomNavTab,
            activeTab === 'physical' && dynamicStyles.bottomNavTabActive,
            activeTab === 'physical' && { backgroundColor: colors.iconBackground }
          ]}
          onPress={() => setActiveTab('physical')}
        >
          <Ionicons 
            name="cube-outline" 
            size={20} 
            color={activeTab === 'physical' ? colors.text : colors.textTertiary} 
          />
          <Text style={[
            dynamicStyles.bottomNavTabText,
            { color: activeTab === 'physical' ? colors.text : colors.textTertiary }
          ]}>
            Physical
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            dynamicStyles.bottomNavTab,
            activeTab === 'pcx' && dynamicStyles.bottomNavTabActive,
            activeTab === 'pcx' && { backgroundColor: colors.iconBackground }
          ]}
          onPress={() => setActiveTab('pcx')}
        >
          <Ionicons 
            name="trending-up-outline" 
            size={20} 
            color={activeTab === 'pcx' ? colors.text : colors.textTertiary} 
          />
          <Text style={[
            dynamicStyles.bottomNavTabText,
            { color: activeTab === 'pcx' ? colors.text : colors.textTertiary }
          ]}>
            PCX
          </Text>
        </TouchableOpacity>
      </View> */}
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      alignItems: 'center',
    }),
  },
  navBarWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 464, // 400px card + 32px padding on each side
      width: '100%',
      alignSelf: 'center',
    }),
  },
  navBar: {
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 464,
    }),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    paddingTop: 32,
    marginBottom: 8,
  },
  navTitle: {
    fontSize: 30,
    fontWeight: 900,
    fontFamily: getFontFamily(900),
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  navLogo: {
    height: 30,
    width: 68, // Maintain aspect ratio: 331/145 * 30 ≈ 68
  },
  dateTimeWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 0,
    ...(Platform.OS === 'web' && {
      maxWidth: 464,
    }),
  },
  dateTimeCard: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dateTimeCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeTextContainer: {
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 15,
    fontWeight: 500,
    fontFamily: getFontFamily(500),
    lineHeight: 20,
  },
  weekendNote: {
    fontSize: 14,
    fontWeight: 500,
    fontFamily: getFontFamily(500),
    lineHeight: 18,
  },
  scrollContainer: {
    paddingHorizontal: 32,
    paddingTop: 0,
    paddingBottom: 32,
  },
  
  // Large Card with Glassmorphism - Fold.money style
  largeCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 0, // No border like Fold.money
    position: 'relative',
    overflow: 'hidden',
    // Fold.money shadow: 0 9px 25px 0 rgba(32, 41, 76, .12)
    shadowColor: 'rgba(32, 41, 76, 0.12)',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 8, // Android shadow
    ...(Platform.OS === 'web' && {
      width: 400,
      alignSelf: 'center',
    }),
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  cardHeaderTextContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  metalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  metalIconGold: {
    width: 96,
    height: 96,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  goldCardLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  goldCardImageContainer: {
    width: 80,             // Reduced from 100 to give text more room
    height: 160,            // Shorter height to match the text content height
    marginRight: 20,        // Clean gap
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,       // Subtle rounding makes the "metal" look premium
  },
  goldCardContent: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
  metalIconImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderTitle: {
    fontSize: 20,           // Updated for better hierarchy
    fontWeight: 600,
    color: '#1A1A1A',
    fontFamily: getFontFamily(600),
  },
  cardPriceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  cardHeaderPrice: {
    fontSize: 28,           // Increased for "Hero" look
    fontWeight: 800,      
    fontFamily: getFontFamily(800),
  },
  priceIndicator: {
    marginTop: 4,
    alignItems: 'center',
  },
  priceChangeText: {
    fontSize: 12,
    fontWeight: 500,
    fontFamily: getFontFamily(500),
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    fontFamily: getFontFamily(400),
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginBottom: 32,
  },
  purityList: {
    gap: 16,               // Reduced from 28 for a tighter group
    marginTop: 10,         // Push slightly away from the divider
  },
  purityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,    // Subtle touch area
  },
  purityLabel: {
    fontSize: 15,
    fontWeight: 500,
    fontFamily: getFontFamily(500),
  },
  purityPrice: {
    fontSize: 15,
    fontWeight: 500,
    fontFamily: getFontFamily(500),
  },
  cardFooter: {
    fontSize: 12,
    fontWeight: 400,
    marginTop: 20,
    fontFamily: getFontFamily(400),
  },
  
  // History Button
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 0, // No border like Fold.money
    // Fold.money shadow: 0 9px 25px 0 rgba(32, 41, 76, .12)
    shadowColor: 'rgba(32, 41, 76, 0.12)',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 8, // Android shadow
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: getFontFamily(600),
  },
  
  // Footer Card
  footerCard: {
    marginBottom: 0,
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 400,
    lineHeight: 18,
    fontFamily: getFontFamily(400),
  },
  
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 464,
      width: 400,
    }),
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 32,
    borderRadius: 36,
    borderWidth: 0, // No border like Fold.money
    gap: 8,
    // Enhanced floating shadow effect
    shadowColor: 'rgba(32, 41, 76, 0.2)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 12, // Android shadow
  },
  bottomNavTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  bottomNavTabActive: {
    // Active state handled by backgroundColor in inline style
  },
  bottomNavTabText: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: getFontFamily(600),
  },
});
