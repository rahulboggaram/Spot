import { supabase } from '@/lib/supabase';
import { getInterFontFeatures } from '@/utils/font-features';
import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Helper function to get the correct font family based on platform and weight
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
  
  const fontName = weightMap[weight] || 'Inter-Regular';
  return fontName;
};

// Helper function to format number with commas
const formatNumberWithCommas = (value: string): string => {
  // Remove all non-digit characters except decimal point
  const numericValue = value.replace(/[^\d.]/g, '');
  
  // Split by decimal point if present
  const parts = numericValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine with decimal part if exists
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// Helper function to remove commas and parse number
const parseNumberFromString = (value: string): number => {
  // Remove all commas and parse
  const numericString = value.replace(/,/g, '');
  return parseFloat(numericString) || 0;
};

// Convert base64url VAPID public key to Uint8Array for pushManager.subscribe (required for iOS PWA Web Push)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

interface PriceEntry {
  id: number;
  gold_999_base: number;
  silver_base: number;
  updated_at: string;
}

export default function AdminScreen() {
  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [priceHistory, setPriceHistory] = useState<PriceEntry[]>([]);
  const [currentGoldPerGram, setCurrentGoldPerGram] = useState<number | null>(null);
  const [currentSilverPerGram, setCurrentSilverPerGram] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Light mode colors only - matching index.tsx
  const colors = {
    background: '#000000', // Black background for admin page
    cardBackground: '#FFFFFF', // White cards
    cardBackgroundLight: 'rgba(255, 255, 255, 0.6)',
    text: '#000000',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    textTertiary: 'rgba(0, 0, 0, 0.4)',
    border: 'rgba(0, 0, 0, 0.2)',
    borderLight: 'rgba(0, 0, 0, 0.1)',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderVerySubtle: 'rgba(0, 0, 0, 0.05)',
    inputBackground: 'rgba(0, 0, 0, 0.05)',
    inputBorder: 'rgba(0, 0, 0, 0.1)',
    buttonBackground: '#000000',
    buttonText: '#FFFFFF',
    buttonDisabled: 'rgba(0, 0, 0, 0.3)',
    divider: 'rgba(0, 0, 0, 0.1)',
  };

  // Ref to hold notification interval for cleanup. Notification schedule is only started
  // when permission is already granted (on load) or after user taps "Enable" (iOS PWA requires user gesture).
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start the 12pm/5pm reminder schedule. Call only when permission is already granted.
  // On iOS PWA, do NOT request permission on page load — request only on button tap.
  const startWebNotificationSchedule = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || (window as any).Notification.permission !== 'granted') {
      return;
    }
    const lastNotificationKey = 'lastPriceUpdateNotification';
    const getLastNotification = () => {
      try {
        const stored = window.localStorage.getItem(lastNotificationKey);
        return stored ? JSON.parse(stored) : { date: '', times: [] };
      } catch {
        return { date: '', times: [] };
      }
    };
    const setLastNotification = (time: string) => {
      try {
        const today = new Date().toDateString();
        const last = getLastNotification();
        const times = last.date === today ? last.times : [];
        times.push(time);
        window.localStorage.setItem(lastNotificationKey, JSON.stringify({ date: today, times }));
      } catch (_) {}
    };
    const checkAndShowNotification = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      if (day >= 1 && day <= 5) {
        const last = getLastNotification();
        const today = now.toDateString();
        if (hour === 12 && minute === 0 && (last.date !== today || !last.times.includes('12:0'))) {
          new (window as any).Notification('Price Update Reminder', {
            body: 'Time to update gold and silver prices (12:00 PM)',
            icon: '/assets/icon.png',
            badge: '/assets/icon.png',
            tag: 'price-update-12pm',
          });
          setLastNotification('12:0');
        }
        if (hour === 17 && minute === 0 && (last.date !== today || !last.times.includes('17:0'))) {
          new (window as any).Notification('Price Update Reminder', {
            body: 'Time to update gold and silver prices (5:00 PM)',
            icon: '/assets/icon.png',
            badge: '/assets/icon.png',
            tag: 'price-update-5pm',
          });
          setLastNotification('17:0');
        }
      }
    };
    if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
    checkAndShowNotification();
    notificationIntervalRef.current = setInterval(checkAndShowNotification, 60000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) reg.active.postMessage({ type: 'CHECK_NOTIFICATIONS' });
      });
    }
    console.log('✅ Web notification schedule started (12pm & 5pm weekdays)');
  }, []);

  // Setup notifications for weekday price updates (12pm and 5pm)
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'web') {
        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
            if ('periodicSync' in registration) {
              try {
                const status = (registration as any).periodicSync.getStatus?.();
                if (status === 'pending' || status === 'denied') {
                  await (registration as any).periodicSync.register?.('check-price-reminders', { minInterval: 60000 });
                }
              } catch (_) {}
            }
            if ('sync' in registration) {
              try {
                await (registration as any).sync.register?.('check-price-reminders');
              } catch (_) {}
            }
          }
        } catch (swError) {
          console.log('⚠️ Service Worker registration failed:', swError);
        }

        // iOS PWA: Do NOT request permission on page load. Only start schedule if already granted.
        try {
          if (typeof window === 'undefined' || !('Notification' in window)) {
            return;
          }
          const permission = (window as any).Notification.permission;
          if (permission === 'granted') {
            startWebNotificationSchedule();
          } else {
            // Do not call requestPermission() here — iOS requires a user gesture (button tap).
            console.log('📱 Tap "Enable notifications" or "Test Notification" to allow reminders (required on iOS home screen app).');
          }
        } catch (error) {
          console.error('❌ Error setting up web notifications:', error);
        }
      } else {
        // Native notifications using expo-notifications
        try {
          // Request notification permissions
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          if (finalStatus !== 'granted') {
            console.log('⚠️ Notification permission not granted');
            return;
          }

          // Cancel any existing notifications
          await Notifications.cancelAllScheduledNotificationsAsync();

          // Schedule notifications for weekdays (Monday = 2, Friday = 6)
          const weekdays = [2, 3, 4, 5, 6]; // Monday to Friday

          // Schedule 12pm notification for each weekday
          for (const weekday of weekdays) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Price Update Reminder',
                body: 'Time to update gold and silver prices (12:00 PM)',
                sound: true,
              },
              trigger: {
                weekday: weekday,
                hour: 12,
                minute: 0,
                repeats: true,
              },
            });
          }

          // Schedule 5pm notification for each weekday
          for (const weekday of weekdays) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Price Update Reminder',
                body: 'Time to update gold and silver prices (5:00 PM)',
                sound: true,
              },
              trigger: {
                weekday: weekday,
                hour: 17, // 5pm
                minute: 0,
                repeats: true,
              },
            });
          }

          console.log('✅ Native notifications scheduled for weekdays at 12pm and 5pm');
        } catch (error) {
          console.error('❌ Error setting up native notifications:', error);
        }
      }
    };

    setupNotifications();
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Load the most recent prices and all price history
  useEffect(() => {
    const loadPrices = async () => {
      try {
        // Load current prices
        const { data: currentData, error: currentError } = await supabase
          .from('market_prices')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (currentError) {
          console.log('⚠️ Could not load latest market price:', currentError.message);
        }
        
        if (currentData) {
          // Store current prices in per gram format for comparison
          setCurrentGoldPerGram(currentData.gold_999_base || 0);
          setCurrentSilverPerGram(currentData.silver_base || 0);
          
          // Convert from per gram to display units:
          // Gold: per gram * 10 = 10 grams rate
          // Silver: per gram * 1000 = 1kg rate
          const goldDisplay = (currentData.gold_999_base * 10).toLocaleString('en-IN');
          const silverDisplay = (currentData.silver_base * 1000).toLocaleString('en-IN');
          setGoldPrice(goldDisplay);
          setSilverPrice(silverDisplay);
        }

        // Load all price history since December 15, 2025
        const startDate = new Date('2025-12-15T00:00:00.000Z');
        const startDateISO = startDate.toISOString();
        
        const { data: historyData, error: historyError } = await supabase
          .from('market_prices')
          .select('*')
          .gte('updated_at', startDateISO)
          .order('updated_at', { ascending: false });

        if (historyError) {
          console.log('⚠️ Could not load market history:', historyError.message);
        }
        
        if (historyData) {
          setPriceHistory(historyData);
        }
      } catch (e) {
        console.error('❌ Failed loading admin prices:', e);
      } finally {
        // Always stop spinner so the admin form is usable even when fetch fails.
        setFetching(false);
      }
    };
    loadPrices();
  }, []);

  // Handle gold price input with comma formatting
  const handleGoldPriceChange = (text: string) => {
    // Allow only digits and commas
    const cleaned = text.replace(/[^\d,]/g, '');
    // Format with commas
    const formatted = formatNumberWithCommas(cleaned);
    setGoldPrice(formatted);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  // Handle silver price input with comma formatting
  const handleSilverPriceChange = (text: string) => {
    // Allow only digits and commas
    const cleaned = text.replace(/[^\d,]/g, '');
    // Format with commas
    const formatted = formatNumberWithCommas(cleaned);
    setSilverPrice(formatted);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  // Check if entered prices are the same as current prices
  const arePricesSame = (): boolean => {
    if (currentGoldPerGram === null || currentSilverPerGram === null || !goldPrice || !silverPrice) {
      console.log('🔍 arePricesSame: Missing data', {
        currentGoldPerGram,
        currentSilverPerGram,
        goldPrice,
        silverPrice
      });
      return false;
    }
    
    const goldPerGram = parseNumberFromString(goldPrice) / 10;
    const silverPerGram = parseNumberFromString(silverPrice) / 1000;
    
    // Use a small epsilon for floating point comparison (0.01 difference tolerance)
    const goldDifference = Math.abs(goldPerGram - currentGoldPerGram);
    const silverDifference = Math.abs(silverPerGram - currentSilverPerGram);
    
    const isSame = goldDifference < 0.01 && silverDifference < 0.01;
    console.log('🔍 arePricesSame check:', {
      goldPerGram,
      currentGoldPerGram,
      goldDifference,
      silverPerGram,
      currentSilverPerGram,
      silverDifference,
      isSame
    });
    
    return isSame;
  };

  const handleUpdate = async () => {
    console.log('🔘 Button clicked - handleUpdate called');
    
    if (!goldPrice || !silverPrice) {
      Alert.alert("Missing Data", "Please enter prices for both metals.");
      return;
    }

    // Convert from input units to per gram for database storage:
    // Gold: 10 grams rate / 10 = per gram
    // Silver: 1kg rate / 1000 = per gram
    // Strip commas before parsing
    const goldPerGram = parseNumberFromString(goldPrice) / 10;
    const silverPerGram = parseNumberFromString(silverPrice) / 1000;
    
    // Check if prices are the same as current prices
    const pricesAreSame = arePricesSame();
    console.log('🔍 Checking if prices are same:', {
      currentGold: currentGoldPerGram,
      currentSilver: currentSilverPerGram,
      enteredGold: goldPerGram,
      enteredSilver: silverPerGram,
      areSame: pricesAreSame
    });
    
    if (pricesAreSame) {
      console.log('⚠️ Prices are the same, showing alert');
      // Use setTimeout to ensure Alert is shown (sometimes needed in React Native)
      setTimeout(() => {
        Alert.alert(
          "Same Prices", 
          "The entered prices are the same as the current prices. Please enter different prices to update."
        );
      }, 100);
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Inserting new price entry:');
      console.log('  Gold input (10g):', goldPrice, '→ per gram:', goldPerGram);
      console.log('  Silver input (1kg):', silverPrice, '→ per gram:', silverPerGram);
      
      const { data: insertedData, error } = await supabase
        .from('market_prices')
        .insert({ 
          gold_999_base: goldPerGram,
          silver_base: silverPerGram,
          updated_at: new Date().toISOString()
        })
        .select(); // Return the inserted data

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }
      
      console.log('✅ Insert successful:', insertedData);
      Alert.alert("Success", `New price entry created! ID: ${insertedData?.[0]?.id || 'N/A'}`);
      
      // Refresh price history since December 15, 2025
      const startDate = new Date('2025-12-15T00:00:00.000Z');
      const startDateISO = startDate.toISOString();
      
      const { data: historyData } = await supabase
        .from('market_prices')
        .select('*')
        .gte('updated_at', startDateISO)
        .order('updated_at', { ascending: false });
      
      if (historyData) {
        setPriceHistory(historyData);
      }
      
      // Update current prices to the newly inserted prices
      setCurrentGoldPerGram(goldPerGram);
      setCurrentSilverPerGram(silverPerGram);
      
      // Send push notifications to all registered devices
      try {
        console.log('📱 Triggering push notifications...');
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'send-price-update-notification',
          {
            body: {
              goldPrice: goldPerGram,
              silverPrice: silverPerGram,
            }
          }
        );
        
        if (functionError) {
          console.log('⚠️ Push notification function error (may not be deployed yet):', functionError);
        } else {
          console.log('✅ Push notifications sent:', functionData);
        }
      } catch (e) {
        console.log('⚠️ Could not send push notifications (function may not exist):', e);
        // This is okay - the function might not be deployed yet
      }
      
      // Keep the submitted values in the form fields (they already have commas formatted)
      // This allows users to see the previous entry and make adjustments if needed
    } catch (error: any) {
      console.error('❌ Error creating entry:', error);
      Alert.alert("Error", error.message || "Failed to create entry. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = createStyles(colors);

  if (fetching) {
    return (
      <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator color={colors.text} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* TOP NAVIGATION BAR - matching index.tsx */}
      <View style={dynamicStyles.navBarWrapper}>
        <View style={dynamicStyles.navBar}>
          <View style={dynamicStyles.logoContainer}>
            <Image 
              source={require('@/assets/images/spot-logo.png')} 
              style={dynamicStyles.navLogo}
              contentFit="contain"
            />
            <Text style={[dynamicStyles.adminLabel, { color: '#FFFFFF' }, getInterFontFeatures()]}>ADMIN</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={dynamicStyles.keyboardView}
      >
        <View style={dynamicStyles.contentWrapper}>
          <ScrollView 
            contentContainerStyle={dynamicStyles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ADMIN CARD - matching index.tsx style */}
            <View style={[
              dynamicStyles.largeCard,
              { backgroundColor: colors.cardBackground }
            ]}>
              <View style={dynamicStyles.inputGroup}>
                <Text style={[dynamicStyles.label, { color: colors.text }, getInterFontFeatures()]}>Gold 24K (10 grams rate)</Text>
                <TextInput 
                  style={[
                    dynamicStyles.input,
                    { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.inputBorder,
                    },
                    getInterFontFeatures()
                  ]}
                  keyboardType="numeric"
                  value={goldPrice}
                  onChangeText={handleGoldPriceChange}
                  placeholder="e.g. 74,500"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={dynamicStyles.inputGroup}>
                <Text style={[dynamicStyles.label, { color: colors.text }, getInterFontFeatures()]}>Silver (1kg rate)</Text>
                <TextInput 
                  style={[
                    dynamicStyles.input,
                    { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.inputBorder,
                    },
                    getInterFontFeatures()
                  ]}
                  keyboardType="numeric"
                  value={silverPrice}
                  onChangeText={handleSilverPriceChange}
                  placeholder="e.g. 92,000"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <TouchableOpacity 
                style={[
                  dynamicStyles.button,
                  { backgroundColor: arePricesSame() || loading ? colors.buttonDisabled : colors.buttonBackground },
                  (arePricesSame() || loading) && { opacity: 0.5 }
                ]} 
                onPress={() => {
                  // Clear any previous error
                  setErrorMessage(null);
                  
                  // Always check prices first
                  const same = arePricesSame();
                  
                  if (same) {
                    setErrorMessage("The entered prices are the same as the current prices. Please enter different prices to update.");
                    return;
                  }
                  
                  // Clear error and proceed with update
                  setErrorMessage(null);
                  handleUpdate();
                }}
                disabled={loading}
              >
                <Text style={[
                  dynamicStyles.buttonText, 
                  { color: arePricesSame() || loading ? colors.textTertiary : colors.buttonText }, 
                  getInterFontFeatures()
                ]}>
                  {loading ? "Updating..." : "Update Live Prices"}
                </Text>
              </TouchableOpacity>
              
              {/* Error message display */}
              {errorMessage && (
                <Text style={[dynamicStyles.errorText, { color: '#F44336' }, getInterFontFeatures()]}>
                  {errorMessage}
                </Text>
              )}
              
              {/* Test Notification Button (Web only) - also subscribes to Web Push for iOS PWA when app is closed */}
              {Platform.OS === 'web' && (
                <TouchableOpacity 
                  style={[
                    dynamicStyles.button,
                    { 
                      backgroundColor: colors.buttonBackground,
                      marginTop: 16,
                      opacity: 0.8,
                    }
                  ]} 
                  onPress={async () => {
                    try {
                      if (typeof window === 'undefined' || !('Notification' in window)) return;
                      const permission = (window as any).Notification.permission;
                      const requested = permission !== 'granted' ? await (window as any).Notification.requestPermission() : permission;
                      if (requested !== 'granted') {
                        Alert.alert('Permission Denied', 'Please allow notifications in your browser settings to receive reminders.');
                        return;
                      }
                      // Local test notification
                      new (window as any).Notification('Test Notification', {
                        body: permission === 'granted' ? 'Notifications are working! You will receive reminders at 12pm and 5pm on weekdays.' : 'Notifications enabled! You will receive reminders at 12pm and 5pm on weekdays.',
                        icon: '/assets/icon.png',
                        tag: 'test-notification',
                      });
                      startWebNotificationSchedule();
                      // Web Push subscription (required for iOS PWA when app is closed/backgrounded)
                      // VAPID public key (generated via: npx web-push generate-vapid-keys)
                      const vapidPublicKey = 'BAXLXgLJsuPNz19ye9iQRGd20aiNUiruzLtgISpvXHx78SdB8bJeTgTOO_qFMG_DH1SXuO7RmwS0Q326soghI3I';
                      if (vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window) {
                        try {
                          const reg = await navigator.serviceWorker.ready;
                          let sub = await reg.pushManager.getSubscription();
                          if (!sub) {
                            sub = await reg.pushManager.subscribe({
                              userVisibleOnly: true,
                              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                            });
                          }
                          if (sub) {
                            const json = sub.toJSON();
                            const endpoint = json.endpoint;
                            const p256dh = json.keys?.p256dh;
                            const auth = json.keys?.auth;
                            if (endpoint && p256dh && auth) {
                              await supabase.from('web_push_subscriptions').upsert(
                                { endpoint, p256dh, auth },
                                { onConflict: 'endpoint' }
                              );
                              console.log('✅ Web Push subscription saved (iOS PWA reminders will work when app is closed).');
                            }
                          }
                        } catch (pushErr) {
                          console.warn('Web Push subscription skipped (optional):', pushErr);
                        }
                      }
                    } catch (error) {
                      console.error('Error showing test notification:', error);
                      Alert.alert('Error', 'Could not show test notification. Check console for details.');
                    }
                  }}
                >
                  <Text style={[
                    dynamicStyles.buttonText, 
                    { color: colors.buttonText }, 
                    getInterFontFeatures()
                  ]}>
                    Test Notification
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* PRICE HISTORY LOG */}
            {priceHistory.length > 0 && (
              <View style={[
                dynamicStyles.largeCard,
                { backgroundColor: colors.cardBackground, marginTop: 0 }
              ]}>
                <Text style={[dynamicStyles.logTitle, { color: colors.text }, getInterFontFeatures()]}>
                  Price History
                </Text>
                <View style={[dynamicStyles.divider, { backgroundColor: colors.divider }]} />
                {priceHistory.map((entry, index) => {
                  const goldDisplay = (entry.gold_999_base * 10).toLocaleString('en-IN');
                  const silverDisplay = (entry.silver_base * 1000).toLocaleString('en-IN');
                  const date = new Date(entry.updated_at);
                  const formattedDate = date.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = date.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <View key={entry.id} style={dynamicStyles.logEntry}>
                      <View style={dynamicStyles.logEntryHeader}>
                        <Text style={[dynamicStyles.logEntryNumber, { color: colors.textSecondary }, getInterFontFeatures()]}>
                          #{priceHistory.length - index}
                        </Text>
                        <Text style={[dynamicStyles.logEntryDate, { color: colors.textTertiary }, getInterFontFeatures()]}>
                          {formattedDate} at {formattedTime}
                        </Text>
                      </View>
                      <View style={dynamicStyles.logEntryPrices}>
                        <View style={dynamicStyles.logPriceRow}>
                          <Text style={[dynamicStyles.logPriceLabel, { color: colors.textSecondary }, getInterFontFeatures()]}>
                            Gold (10g):
                          </Text>
                          <Text style={[dynamicStyles.logPriceValue, { color: colors.text }, getInterFontFeatures()]}>
                            ₹{goldDisplay}
                          </Text>
                        </View>
                        <View style={dynamicStyles.logPriceRow}>
                          <Text style={[dynamicStyles.logPriceLabel, { color: colors.textSecondary }, getInterFontFeatures()]}>
                            Silver (1kg):
                          </Text>
                          <Text style={[dynamicStyles.logPriceValue, { color: colors.text }, getInterFontFeatures()]}>
                            ₹{silverDisplay}
                          </Text>
                        </View>
                      </View>
                      {index < priceHistory.length - 1 && (
                        <View style={[dynamicStyles.logDivider, { backgroundColor: colors.divider }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBarWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16, // 16px padding on all platforms (mobile web and native)
    ...(Platform.OS === 'web' && {
      maxWidth: 432, // 400px card + 16px padding on each side
      alignSelf: 'center',
    }),
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    // No padding here - padding is in contentWrapper to avoid doubling
  },
  navBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    paddingTop: 32,
    marginBottom: 8,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  navLogo: {
    height: 30,
    width: 68, // Maintain aspect ratio: 331/145 * 30 ≈ 68
  },
  adminLabel: {
    fontSize: 12,
    fontFamily: getFontFamily(700),
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...(Platform.OS === 'web' && { fontWeight: 700 }),
  },
  scrollContainer: {
    paddingTop: 0,
    paddingBottom: 32,
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 0, // Padding comes from contentWrapper on web
    }),
    ...(Platform.OS !== 'web' && {
      paddingHorizontal: 0, // Padding comes from contentWrapper on native too
    }),
  },
  
  // Large Card - matching index.tsx
  largeCard: {
    padding: 32,
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 0,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 400,
      alignSelf: 'center',
    }),
    // On native, cards take full width (padding is handled by parent containers)
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontFamily: getFontFamily(500),
    marginBottom: 12,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    borderWidth: 1,
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontFamily: getFontFamily(700),
    fontSize: 16,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 700 }),
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    fontFamily: getFontFamily(400),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 400 }),
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  logTitle: {
    fontSize: 20,
    fontFamily: getFontFamily(700),
    marginBottom: 16,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 700 }),
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  logEntry: {
    marginBottom: 16,
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logEntryNumber: {
    fontSize: 13,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  logEntryDate: {
    fontSize: 12,
    fontFamily: getFontFamily(400),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 400 }),
  },
  logEntryPrices: {
    gap: 6,
  },
  logPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logPriceLabel: {
    fontSize: 14,
    fontFamily: getFontFamily(500),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  logPriceValue: {
    fontSize: 14,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  logDivider: {
    height: 1,
    width: '100%',
    marginTop: 16,
  },
});