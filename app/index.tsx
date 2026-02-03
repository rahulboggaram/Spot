import { MetalPriceCard } from '@/components/metal-price-card';
import { historicalPrices } from '@/data/historical-prices';
import { supabase } from '@/lib/supabase';
import { fetchAndUpdateWidget } from '@/lib/widget-background-update';
import { getInterFontFeatures } from '@/utils/font-features';
import { ExtensionStorage } from "@bacons/apple-targets";
import { Ionicons } from '@expo/vector-icons';
import * as BackgroundFetch from 'expo-background-fetch';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  InteractionManager,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

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

const APP_GROUP = 'group.com.rahulboggaram.Spot.goldapp';

// Background App Refresh: iOS may wake the app periodically when in background to update the widget.
// Only works when app is backgrounded (not force-quit). Must be defined at top level.
const WIDGET_BACKGROUND_TASK = 'widget-price-refresh';
TaskManager.defineTask(WIDGET_BACKGROUND_TASK, async () => {
  try {
    const updated = await fetchAndUpdateWidget();
    return updated ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper function to get the correct font family based on platform and weight
// React Native doesn't support variable fonts well, so we use separate font files per weight
const getFontFamily = (weight: number = 400) => {
  if (Platform.OS === 'web') {
    return "'Inter', sans-serif";
  }
  
  // Map font weights to specific font family names (static fonts)
  // These names MUST match exactly what was registered in useFonts() in _layout.tsx
  // For Expo Go, the font name must match the key used in useFonts()
  const weightMap: { [key: number]: string } = {
    400: 'Inter-Regular',
    500: 'Inter-Medium',
    600: 'Inter-SemiBold',
    700: 'Inter-Bold',
    800: 'Inter-ExtraBold',
    900: 'Inter-Black',
  };
  
  const fontName = weightMap[weight] || 'Inter-Regular';
  
  // Debug logging for Expo Go (can be removed later)
  if (__DEV__) {
    console.log(`🔤 Using font: ${fontName} for weight: ${weight}`);
  }
  
  // On iOS/Android, if the font isn't loaded, React Native will fallback to system font
  // So we can safely return the font name
  return fontName;
};

export default function GoldApp() {
  // 🧪 TEST LOG - This should appear immediately when app opens
  console.log('🚀 ===== APP LOADED - LOGGING IS WORKING! =====');
  console.log('🚀 Current time:', new Date().toLocaleTimeString());
  
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [previousPrices, setPreviousPrices] = useState<{ gold: number; silver: number } | null>(null);
  // Use ref to store previous price synchronously for immediate comparison
  const previousPricesRef = useRef<{ gold: number; silver: number } | null>(null);
  // Prevent concurrent native writes (can crash iOS / Hermes with EXC_BAD_ACCESS)
  const widgetUpdateInFlightRef = useRef(false);
  const lastWidgetUpdateAtRef = useRef(0);
  const fetchPricesInFlightRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'physical' | 'pcx'>('physical');
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  // Light mode colors only
  const colors = {
    background: '#000000', // App background color (black)
    cardBackground: '#FFFFFF', // White cards
    cardBackgroundLight: 'rgba(255, 255, 255, 0.6)',
    cardBackgroundFooter: 'rgba(255, 255, 255, 0.4)',
    text: '#000000',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    textTertiary: 'rgba(0, 0, 0, 0.4)',
    border: 'rgba(0, 0, 0, 0.2)',
    borderLight: 'rgba(0, 0, 0, 0.1)',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderVerySubtle: 'rgba(0, 0, 0, 0.05)',
    iconBackground: 'rgba(0, 0, 0, 0.15)',
    iconBackgroundDark: 'rgba(0, 0, 0, 0.1)',
    iconBorder: 'rgba(0, 0, 0, 0.3)',
    iconBorderDark: 'rgba(0, 0, 0, 0.2)',
    glassOverlay: 'rgba(0, 0, 0, 0.02)',
    statusBadgeBg: 'rgba(0, 0, 0, 0.05)',
    statusBadgeBorder: 'rgba(0, 0, 0, 0.1)',
    statusBadgeBorderOpen: 'rgba(0, 0, 0, 0.3)',
    statusGlow: 'rgba(0, 0, 0, 0.15)',
    divider: 'rgba(0, 0, 0, 0.1)',
    priceUp: '#4CAF50', // Green for price increase
    priceDown: '#F44336', // Red for price decrease
  };

  // Helper function to update widget with price (uses fallback if needed)
  const updateWidget = async (goldPrice?: number, goldChange?: { direction: string | null; difference: number; percentage: number }, silverChange?: { direction: string | null; difference: number; percentage: number }, silverPrice?: number) => {
    try {
      // Debounce + single-flight to avoid concurrent native module calls
      if (widgetUpdateInFlightRef.current) {
        return;
      }
      const now = Date.now();
      if (now - lastWidgetUpdateAtRef.current < 1500) {
        return;
      }
      widgetUpdateInFlightRef.current = true;
      lastWidgetUpdateAtRef.current = now;

      // Check if SharedGroupPreferences is available (only on iOS)
      if (Platform.OS !== 'ios') {
        console.log('⚠️ Widget update skipped - not on iOS');
        widgetUpdateInFlightRef.current = false;
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
        widgetUpdateInFlightRef.current = false;
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
      
      // If we have a valid price (just check > 0, no range restrictions), update the widget
      if (priceToUse && priceToUse > 0) {
        const roundedPrice = Math.round(priceToUse);
        const widgetPrice = `₹${(roundedPrice * 10).toLocaleString('en-IN')}`; // Convert to 10g format
        
        // Get silver price (convert per gram to 1kg) - use passed parameter first, then data, then shared defaults
        let silverPricePerGram = silverPrice || data?.silver_base || 0;
        console.log('🔧 updateWidget silver price - passed:', silverPrice, 'data?.silver_base:', data?.silver_base, 'using:', silverPricePerGram);
        if (silverPricePerGram === 0) {
          // Try to get from shared defaults as fallback (on main thread)
          try {
            await new Promise<void>((resolve) => {
              InteractionManager.runAfterInteractions(async () => {
                try {
                  const sharedDefaults = await SharedGroupPreferences.getItem('silverPrice', APP_GROUP);
                  if (sharedDefaults && typeof sharedDefaults === 'string') {
                    // Extract numeric value from formatted string like "₹92,000"
                    const numericStr = sharedDefaults.replace(/[₹,]/g, '');
                    silverPricePerGram = parseFloat(numericStr) / 1000;
                  }
                } catch (e) {
                  // Ignore error, use 0
                }
                resolve();
              });
            });
          } catch (e) {
            // Ignore error, use 0
          }
        }
        const silverPrice1kg = silverPricePerGram * 1000;
        const widgetSilverPrice = `₹${Math.round(silverPrice1kg).toLocaleString('en-IN')}`;
        
        // Get price change percentages and differences (use passed parameters or default to 0)
        const goldChangePct = goldChange?.percentage ?? 0;
        const silverChangePct = silverChange?.percentage ?? 0;
        const goldChangeDiff = goldChange?.difference ?? 0;
        const silverChangeDiff = silverChange?.difference ?? 0;
        const goldChangeDirection = goldChange?.direction ?? null;
        const silverChangeDirection = silverChange?.direction ?? null;
        
        console.log('🔧 Saving to widget - Gold:', widgetPrice, 'Silver:', widgetSilverPrice);
        console.log('🔧 Price changes - Gold:', goldChangePct, 'Silver:', silverChangePct);
        console.log('🔧 Price differences - Gold:', goldChangeDiff, 'Silver:', silverChangeDiff);
        console.log('🔧 Price directions - Gold:', goldChangeDirection, 'Silver:', silverChangeDirection);
        
        // Ensure we have valid direction and difference before writing
        const goldDirToWrite = (goldChangeDirection === 'up' || goldChangeDirection === 'down') ? String(goldChangeDirection) : '';
        const silverDirToWrite = (silverChangeDirection === 'up' || silverChangeDirection === 'down') ? String(silverChangeDirection) : '';
        
        console.log('🔧 Writing to widget - Gold dir:', goldDirToWrite, 'diff:', goldChangeDiff, 'Silver dir:', silverDirToWrite, 'diff:', silverChangeDiff);
        
        try {
          // IMPORTANT: SharedGroupPreferences expects string values on iOS.
          await SharedGroupPreferences.setItem('currentPrice', String(widgetPrice), APP_GROUP);
          await SharedGroupPreferences.setItem('silverPrice', String(widgetSilverPrice), APP_GROUP);
          await SharedGroupPreferences.setItem('goldChange', String(goldChangePct), APP_GROUP);
          await SharedGroupPreferences.setItem('silverChange', String(silverChangePct), APP_GROUP);
          await SharedGroupPreferences.setItem('goldChangeDiff', String(goldChangeDiff), APP_GROUP);
          await SharedGroupPreferences.setItem('silverChangeDiff', String(silverChangeDiff), APP_GROUP);
          await SharedGroupPreferences.setItem('goldChangeDirection', goldDirToWrite, APP_GROUP);
          await SharedGroupPreferences.setItem('silverChangeDirection', silverDirToWrite, APP_GROUP);
          console.log('✅ Widget change data written successfully');
          await SharedGroupPreferences.setItem('widgetDataLoaded', 'true', APP_GROUP);

          // Reload widget once (no timers)
          if (ExtensionStorage && typeof ExtensionStorage.reloadWidget === 'function') {
            try {
              ExtensionStorage.reloadWidget();
            } catch (reloadError) {
              console.log('⚠️ Widget reload failed:', reloadError);
            }
          }
        } catch (saveError) {
          console.log('⚠️ Widget update write failed:', saveError);
        }
      } else {
        console.log('⚠️ No valid gold price available for widget update');
      }
    } catch (widgetError) {
      console.log('⚠️ Widget Update Failed:', widgetError);
    } finally {
      widgetUpdateInFlightRef.current = false;
    }
  };

  const fetchPrices = async () => {
    try {
      if (fetchPricesInFlightRef.current) return;
      fetchPricesInFlightRef.current = true;
      // Only show loading state on initial load (no data yet). Background polling should not flash the UI.
      if (!data) setIsLoading(true);
      // Get the two most recent entries: latest (current) and previous
      const { data: entries, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(2);
      
      if (error) {
        // If network error, keep showing last known data instead of clearing it
        const errorMessage = (error as any)?.message || '';
        const errorCode = (error as any)?.code || '';
        if (errorMessage.includes('network') || errorMessage.includes('offline') || errorCode === 'PGRST116') {
          console.log('⚠️ Network error - using cached data:', errorMessage);
          setIsLoading(false);
          // Don't clear data, keep showing last known prices
          return;
        }
        throw error;
      }
      
      if (!entries || entries.length === 0) {
        console.log('No price entries found');
        setIsLoading(false); // Stop loading even if no data
        // Update widget with fallback data even if no database entries
        await updateWidget(undefined, undefined, undefined, undefined);
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
        // Calculate price changes directly from database entries (not from state)
        const priceChange = calculatePriceChangeFromEntries(latestEntry, previousEntry);
        // Get silver price directly from latestEntry (not from stale data state)
        const silverPriceForWidget = typeof latestEntry.silver_base === 'string'
          ? parseFloat(latestEntry.silver_base)
          : latestEntry.silver_base || 0;
        console.log('📊 Updating widget with silver price from database:', silverPriceForWidget);
        console.log('📊 Price change calculated:', priceChange);
        // Update widget immediately with new prices and changes
        await updateWidget(goldPriceForWidget, priceChange?.gold, priceChange?.silver, silverPriceForWidget);
        console.log('✅ Widget update completed for new price');
      } else {
        console.log('⚠️ Invalid gold price for widget:', goldPriceForWidget, 'type:', typeof goldPriceForWidget);
        // Still try to update with fallback
        const priceChange = calculatePriceChangeFromEntries(latestEntry, previousEntry);
        const silverPriceForWidget = typeof latestEntry.silver_base === 'string'
          ? parseFloat(latestEntry.silver_base)
          : latestEntry.silver_base || 0;
        await updateWidget(undefined, priceChange?.gold, priceChange?.silver, silverPriceForWidget);
      }
    } catch (e) {
      console.error('Error fetching prices:', e);
      setIsLoading(false); // Stop loading on error
      
      // If network error, keep showing last known data
      const errorMessage = (e as any)?.message || '';
      const errorCode = (e as any)?.code || '';
      const isNetworkError = errorMessage.includes('network') || 
                            errorMessage.includes('offline') || 
                            errorMessage.includes('fetch') ||
                            errorCode === 'PGRST116';
      
      if (isNetworkError && data) {
        console.log('⚠️ Network error - keeping last known prices');
        // Keep showing the last known data, don't clear it
        return;
      }
      
      // Update widget with fallback data even on error
      await updateWidget();
    } finally {
      fetchPricesInFlightRef.current = false;
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
        return; 
      }
      
      if (historical && historical.length > 0) {
        setHistoricalData(historical);
      }
    } catch (e) {
      console.log('Silent error in history:', e);
    }
  };

  useEffect(() => {
    console.log('🚀 ===== useEffect RUNNING - Starting data fetch =====');
    console.log('🚀 Static historical prices available:', historicalPrices.length, 'entries');
    
    // Delay widget update slightly to ensure native modules are ready
    // Immediately update widget with static data on app load (so it doesn't show "Loading...")
    if (historicalPrices.length > 0 && Platform.OS === 'ios') {
      const initialPrice = historicalPrices[0].goldPricePM / 10;
      console.log('🚀 Initial widget update with static price:', initialPrice);
      // Delay to ensure native modules are initialized
      setTimeout(() => {
        updateWidget(initialPrice, undefined, undefined, undefined).catch(err => {
          console.log('⚠️ Initial widget update failed (non-critical):', err);
        });
      }, 500);
    }
    
    console.log('🚀 Calling fetchPrices()...');
    fetchPrices();
    console.log('🚀 Calling fetchHistoricalPrices()...');
    fetchHistoricalPrices();
    
    // Supabase Realtime: instant update when admin inserts a new price (app and widget)
    const channel = supabase
      .channel('market_prices_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_prices',
      }, async () => {
        console.log('📡 Realtime: new price inserted, fetching latest...');
        await fetchPrices();
      })
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });
    
    // Refetch when app comes to foreground so opening the app always shows latest
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('📱 App became active, refetching prices...');
        fetchPrices();
      }
    });
    
    // Polling fallback when Realtime is unavailable (e.g. network blip)
    const pollingInterval = setInterval(() => {
      fetchPrices();
    }, 60000); // Poll every 60s (Realtime handles instant updates)
    
    return () => {
      supabase.removeChannel(channel);
      subscription.remove();
      clearInterval(pollingInterval);
    };
  }, []);

  // Update widget when historical data becomes available (safety net)
  useEffect(() => {
    if (historicalData.length > 0 && !data && Platform.OS === 'ios') {
      // If we have historical data but no current data, update widget with historical
      const latestEntry = historicalData[0];
      const goldPrice = (latestEntry.gold_price_pm || latestEntry.goldPricePM) / 10;
      updateWidget(goldPrice, undefined, undefined, undefined).catch(err => {
        console.log('⚠️ Historical widget update failed (non-critical):', err);
      });
    }
  }, [historicalData]);

  // Register Background App Refresh (iOS only) - lets iOS wake the app periodically when in background to update the widget
  useEffect(() => {
    if (Platform.OS === 'ios') {
      (async () => {
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_BACKGROUND_TASK);
          if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(WIDGET_BACKGROUND_TASK, {
              minimumInterval: 60 * 15, // ~15 min (iOS may run less often)
            });
            console.log('✅ Background App Refresh registered for widget updates');
          }
        } catch (e) {
          console.log('⚠️ Background App Refresh registration failed:', e);
        }
      })();
    }
  }, []);

  // Register for push notifications (iOS only) - separate useEffect
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const registerForPushNotifications = async () => {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          if (finalStatus !== 'granted') {
            console.log('⚠️ Push notification permission not granted');
            return;
          }
          
          // Get Expo push token
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            const pushToken = tokenData.data;
            console.log('📱 Expo Push Token:', pushToken);
            
            // Save token to Supabase for sending notifications
            try {
              const { error } = await supabase
                .from('device_tokens')
                .upsert({
                  token: pushToken,
                  platform: 'ios',
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'token'
                });
              
              if (error) {
                console.log('⚠️ Error saving push token (table may not exist):', error);
              } else {
                console.log('✅ Push token saved to database');
              }
            } catch (e) {
              console.log('⚠️ Could not save push token:', e);
            }
          } catch (tokenError) {
            console.log('⚠️ Could not get Expo push token:', tokenError);
          }
          
          // Set up notification handler
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            }),
          });
          
          // Handle notification received while app is in foreground
          const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('📱 Notification received:', notification);
            // When notification is received, refresh prices and update widget
            fetchPrices();
          });
          
          // Handle notification tapped
          const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('📱 Notification tapped:', response);
            // Refresh prices when user taps notification
            fetchPrices();
          });
          
          return () => {
            subscription.remove();
            responseSubscription.remove();
          };
        } catch (e) {
          console.error('❌ Error registering for push notifications:', e);
        }
      };
      
      registerForPushNotifications();
    }
  }, []); // Only run once on mount
  
  // Note: widget is updated inside fetchPrices() to avoid concurrent native writes.

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
  // Calculate price change from two database entries (for widget updates)
  const calculatePriceChangeFromEntries = (currentEntry: any, previousEntry: any) => {
    if (!currentEntry) return null;
    
    // Get current prices (stored as per gram, convert to input units)
    const currentGold10g = (currentEntry.gold_999_base || 0) * 10;
    const currentSilver1kg = (currentEntry.silver_base || 0) * 1000;
    
    // Get previous prices
    const previousGold10g = (previousEntry?.gold_999_base || 0) * 10;
    const previousSilver1kg = (previousEntry?.silver_base || 0) * 1000;
    
    // Calculate differences
    const goldDifference10g = currentGold10g - previousGold10g;
    const silverDifference1kg = currentSilver1kg - previousSilver1kg;
    
    // Gold: Convert difference to per gram for display
    const goldDifferencePerGram = Math.abs(goldDifference10g) / 10;
    const goldPercentage = previousGold10g > 0 ? (goldDifferencePerGram / (previousGold10g / 10)) * 100 : 0;
    
    // Silver: Keep difference in 1kg units
    const silverDifference = Math.abs(silverDifference1kg);
    const silverPercentage = previousSilver1kg > 0 ? (silverDifference / previousSilver1kg) * 100 : 0;
    
    // Determine direction: up (green), down (red), or no change (grey/null)
    const goldDirection = goldDifference10g > 0.01 ? 'up' : goldDifference10g < -0.01 ? 'down' : null;
    const silverDirection = silverDifference1kg > 0.01 ? 'up' : silverDifference1kg < -0.01 ? 'down' : null;
    
    console.log('🔍 Price Change Calculation from entries:');
    console.log('  Previous Gold (10g):', previousGold10g, 'Current:', currentGold10g, 'Diff:', goldDifference10g);
    console.log('  Previous Silver (1kg):', previousSilver1kg, 'Current:', currentSilver1kg, 'Diff:', silverDifference1kg);
    console.log('  Gold direction:', goldDirection, 'diff:', goldDifferencePerGram);
    console.log('  Silver direction:', silverDirection, 'diff:', silverDifference);
    
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

  const getPriceChangeFromDatabase = () => {
    if (!data || isLoading) {
      // If no current data or still loading, return null so loading state shows
      return null;
    }
    
    // Get current prices from database (stored as per gram, convert to input units)
    const currentGold10g = (data.gold_999_base || 0) * 10; // Convert per gram to 10g rate
    const currentSilver1kg = (data.silver_base || 0) * 1000; // Convert per gram to 1kg rate
    
    // Get previous prices from ref (immediate access) or state (set when admin updates)
    // If not available, try to use historical data (second entry) as previous price
    let previousGold10g = currentGold10g;
    let previousSilver1kg = currentSilver1kg;
    
    const prevPrices = previousPricesRef.current || previousPrices;
    if (prevPrices) {
      // Use stored previous prices
      previousGold10g = prevPrices.gold * 10;
      previousSilver1kg = prevPrices.silver * 1000;
    } else if (historicalData && historicalData.length > 1) {
      // Use second entry from historical data as previous price (first entry is current)
      const previousEntry = historicalData[1];
      previousGold10g = (previousEntry.gold_price_pm || previousEntry.goldPricePM || 0);
      previousSilver1kg = (previousEntry.silver_price_pm || previousEntry.silverPricePM || 0);
      console.log('🔍 Using historical data for previous prices:', { previousGold10g, previousSilver1kg });
    } else if (historicalPrices && historicalPrices.length > 1) {
      // Fallback to static historical data
      const previousEntry = historicalPrices[1];
      previousGold10g = previousEntry.goldPricePM || 0;
      previousSilver1kg = previousEntry.silverPricePM || 0;
      console.log('🔍 Using static historical data for previous prices:', { previousGold10g, previousSilver1kg });
    }
    
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
  // Use change data from database, or default to no change
  const goldChange = dbPriceChange?.gold || { direction: null, difference: 0, percentage: 0 };
  const silverChange = dbPriceChange?.silver || { direction: null, difference: 0, percentage: 0 };
  
  // Log for debugging
  console.log('📊 Price change data:', { goldChange, silverChange });
  
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

  const insets = useSafeAreaInsets();
  const dynamicStyles = createStyles(colors, insets);

  return (
    <View style={[dynamicStyles.safeArea, { backgroundColor: '#000000' }, getInterFontFeatures()]}>
      <StatusBar barStyle="light-content" translucent={true} />
      
      <View style={dynamicStyles.contentWrapper}>
        <ScrollView 
          contentContainerStyle={dynamicStyles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          style={{ flex: 1 }}
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
              {isLoading || !latestUpdateDate || !data ? (
                // Show gray containers (loading state) instead of dummy data
                <View style={dynamicStyles.dateTimeCardContent}>
                  <View style={dynamicStyles.dateTimeTextContainer}>
                    <View style={{ 
                      width: 120, 
                      height: 18, 
                      backgroundColor: 'rgba(0,0,0,0.05)', 
                      borderRadius: 4,
                      alignSelf: 'center',
                      marginBottom: 6
                    }} />
                    <View style={{ 
                      width: 200, 
                      height: 18, 
                      backgroundColor: 'rgba(0,0,0,0.05)', 
                      borderRadius: 4,
                      alignSelf: 'center'
                    }} />
                  </View>
                </View>
              ) : (
                (() => {
                  // Use latest update date from historical prices (last published date)
                  // This will be the last trading day (not weekend)
                  const updateDate = latestUpdateDate;
                  
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
                        <Text style={[dynamicStyles.dateTimeText, { color: '#FFFFFF' }, getInterFontFeatures()]}>
                          Price updated on
                        </Text>
                        <Text style={[dynamicStyles.dateTimeText, { color: '#FFFFFF' }, getInterFontFeatures()]}>
                          {formattedDay} • {formattedDate} at {formattedTime}
                        </Text>
                        {isTodayWeekend && (
                          <Text style={[dynamicStyles.weekendNote, { color: '#FFFFFF' }]}>
                            Sat & Sun the rates are not published
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })()
              )}
            </View>
          </View>
          {/* GOLD CARD */}
          <MetalPriceCard
            title="Gold"
            subtitle="1g"
            basePrice={goldBase}
            priceChange={goldChange}
            colors={colors}
            priceMultiplier={1}
            isLoading={isLoading || goldBase === null}
          />

          {/* SILVER CARD */}
          <MetalPriceCard
            title="Silver"
            subtitle="1kg"
            basePrice={silverBase}
            priceChange={silverChange}
            colors={colors}
            priceMultiplier={1000}
            isLoading={isLoading || silverBase === null}
          />

          {/* Historical Prices Button */}
          <TouchableOpacity 
            style={[dynamicStyles.historyButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => router.push('/price-history')}
          >
            <Text style={[dynamicStyles.historyButtonText, { color: colors.text }]}>View Price History</Text>
          </TouchableOpacity>

          {/* Last Updated Footer */}
          <View style={dynamicStyles.footerCard}>
            <Text style={[dynamicStyles.lastUpdated, { color: '#FFFFFF' }]}>
              Rates updated from Monday to Friday{'\n'}at 12.00pm & 5.00pm
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

          {/* Web-only: Support & Privacy links (for App Store Support URL / Privacy Policy URL) */}
          {Platform.OS === 'web' && (
            <View style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => router.push('/support')} style={{ padding: 8 }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, fontFamily: getFontFamily(500), ...(Platform.OS === 'web' && { fontWeight: '500' }) }}>
                  Support / Contact
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/privacy')} style={{ padding: 8 }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, fontFamily: getFontFamily(500), ...(Platform.OS === 'web' && { fontWeight: '500' }) }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>


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
    </View>
  );
}

const createStyles = (colors: any, insets?: { top: number; bottom: number }) => StyleSheet.create({
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
      width: '100%',
      paddingHorizontal: 16, // 16px padding on web
      maxWidth: 432, // 400px card + 16px padding on each side
      alignSelf: 'center',
    }),
  },
  navBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    paddingTop: 0, // Removed top padding completely
  },
  widgetPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  widgetPreviewButtonText: {
    fontSize: 12,
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  navTitle: {
    fontSize: 30,
    fontFamily: getFontFamily(900),
    textAlign: 'center',
    textTransform: 'lowercase',
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 900 }),
  },
  navLogo: {
    height: 39, // 30 * 1.3 = 39
    width: 88.4, // 68 * 1.3 = 88.4 (maintain aspect ratio)
  },
  dateTimeWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  dateTimeCard: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  dateTimeTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  dateTimeText: {
    fontSize: 15,
    fontFamily: getFontFamily(500),
    lineHeight: 18,
    letterSpacing: -0.02,
    textAlign: 'center',
    alignSelf: 'center',
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  weekendNote: {
    fontSize: 15,
    fontFamily: getFontFamily(500),
    lineHeight: 18,
    letterSpacing: -0.02,
    textAlign: 'center',
    alignSelf: 'center',
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' 
      ? (insets && insets.top ? insets.top + 20 : 60) // Use safe area inset + 20px for iOS
      : Platform.OS === 'android' 
        ? (insets && insets.top ? insets.top + 20 : 50) // Use safe area inset + 20px for Android
        : 0,
    paddingBottom: Platform.OS === 'ios' 
      ? (insets && insets.bottom ? insets.bottom + 20 : 40) // Use safe area inset + 20px for iOS
      : Platform.OS === 'android' 
        ? (insets && insets.bottom ? insets.bottom + 20 : 32) // Use safe area inset + 20px for Android
        : 0,
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 0, // Padding comes from contentWrapper on web
      paddingTop: 16, // 16px top padding on web
      paddingBottom: 32,
    }),
  },
  
  // Large Card with Glassmorphism - Fold.money style
  largeCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 0,
    position: 'relative',
    overflow: 'hidden',
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
    color: '#1A1A1A',
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  cardPriceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  cardHeaderPrice: {
    fontSize: 28,           // Increased for "Hero" look
    fontFamily: getFontFamily(800),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 800 }),
  },
  priceIndicator: {
    marginTop: 4,
    alignItems: 'center',
  },
  priceChangeText: {
    fontSize: 12,
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    fontFamily: getFontFamily(400),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 400 }),
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
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  purityPrice: {
    fontSize: 15,
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  cardFooter: {
    fontSize: 12,
    marginTop: 20,
    fontFamily: getFontFamily(400),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 400 }),
  },
  
  // History Button
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 32,
    marginBottom: 16,
    borderWidth: 0,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 400,
      alignSelf: 'center',
    }),
  },
  historyButtonText: {
    fontSize: 14,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  
  // Footer Card
  footerCard: {
    marginBottom: 0,
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24, // Line height 24px
    fontFamily: getFontFamily(500), // Font weight 500 (Medium)
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }), // Font weight 500 for web
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
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
});
