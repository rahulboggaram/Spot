import { supabase } from '@/lib/supabase';
import type { MarketPrice } from '@/types/market';
import { getFontFamily } from '@/utils/font';
import { getInterFontFeatures } from '@/utils/font-features';
import { logger } from '@/utils/logger';
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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Helper function to format number with commas
const formatNumberWithCommas = (value: string): string => {
  const numericValue = value.replace(/[^\d.]/g, '');
  const parts = numericValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// Helper function to remove commas and parse number
const parseNumberFromString = (value: string): number => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

// Convert base64url VAPID public key to Uint8Array for pushManager.subscribe (required for iOS PWA Web Push)
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const HISTORY_START_DATE = '2025-12-15T00:00:00.000Z';
const GOLD_PER_GRAM_DIVISOR = 10;
const SILVER_PER_GRAM_DIVISOR = 1000;

const colors = {
  background: '#000000',
  cardBackground: '#FFFFFF',
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

export default function AdminScreen() {
  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [priceHistory, setPriceHistory] = useState<MarketPrice[]>([]);
  const [currentGoldPerGram, setCurrentGoldPerGram] = useState<number | null>(null);
  const [currentSilverPerGram, setCurrentSilverPerGram] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the 12pm/5pm reminder schedule. Call only when permission is already granted.
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
      } catch {
        // Ignore localStorage errors
      }
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
  }, []);

  // Setup notifications for weekday price updates (12pm and 5pm)
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'web') {
        try {
          if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/sw.js');
          }
        } catch (swError) {
          logger.warn('Service Worker registration failed:', swError);
        }

        try {
          if (typeof window === 'undefined' || !('Notification' in window)) return;
          if ((window as any).Notification.permission === 'granted') {
            startWebNotificationSchedule();
          }
        } catch (error) {
          logger.error('Error setting up web notifications:', error);
        }
      } else {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== 'granted') return;

          await Notifications.cancelAllScheduledNotificationsAsync();

          const weekdays = [2, 3, 4, 5, 6];
          for (const weekday of weekdays) {
            await Notifications.scheduleNotificationAsync({
              content: { title: 'Price Update Reminder', body: 'Time to update gold and silver prices (12:00 PM)', sound: true },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, weekday, hour: 12, minute: 0, repeats: true },
            });
            await Notifications.scheduleNotificationAsync({
              content: { title: 'Price Update Reminder', body: 'Time to update gold and silver prices (5:00 PM)', sound: true },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, weekday, hour: 17, minute: 0, repeats: true },
            });
          }
        } catch (error) {
          logger.error('Error setting up native notifications:', error);
        }
      }
    };

    setupNotifications();

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, []);

  const loadPriceHistory = async () => {
    const { data: historyData } = await supabase
      .from('market_prices')
      .select('*')
      .gte('updated_at', HISTORY_START_DATE)
      .order('updated_at', { ascending: false });

    if (historyData) {
      setPriceHistory(historyData);
    }
  };

  // Load the most recent prices and all price history
  useEffect(() => {
    const loadPrices = async () => {
      const { data: currentData } = await supabase
        .from('market_prices')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (currentData) {
        setCurrentGoldPerGram(currentData.gold_999_base ?? 0);
        setCurrentSilverPerGram(currentData.silver_base ?? 0);
        setGoldPrice((currentData.gold_999_base * GOLD_PER_GRAM_DIVISOR).toLocaleString('en-IN'));
        setSilverPrice((currentData.silver_base * SILVER_PER_GRAM_DIVISOR).toLocaleString('en-IN'));
      }

      await loadPriceHistory();
      setFetching(false);
    };
    loadPrices();
  }, []);

  const handleGoldPriceChange = (text: string) => {
    setGoldPrice(formatNumberWithCommas(text.replace(/[^\d,]/g, '')));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSilverPriceChange = (text: string) => {
    setSilverPrice(formatNumberWithCommas(text.replace(/[^\d,]/g, '')));
    if (errorMessage) setErrorMessage(null);
  };

  const arePricesSame = (): boolean => {
    if (currentGoldPerGram === null || currentSilverPerGram === null || !goldPrice || !silverPrice) {
      return false;
    }
    const goldPerGram = parseNumberFromString(goldPrice) / GOLD_PER_GRAM_DIVISOR;
    const silverPerGram = parseNumberFromString(silverPrice) / SILVER_PER_GRAM_DIVISOR;
    return Math.abs(goldPerGram - currentGoldPerGram) < 0.01 && Math.abs(silverPerGram - currentSilverPerGram) < 0.01;
  };

  const handleUpdate = async () => {
    if (!goldPrice || !silverPrice) {
      Alert.alert("Missing Data", "Please enter prices for both metals.");
      return;
    }

    const goldPerGram = parseNumberFromString(goldPrice) / GOLD_PER_GRAM_DIVISOR;
    const silverPerGram = parseNumberFromString(silverPrice) / SILVER_PER_GRAM_DIVISOR;

    if (arePricesSame()) {
      setTimeout(() => {
        Alert.alert("Same Prices", "The entered prices are the same as the current prices. Please enter different prices to update.");
      }, 100);
      return;
    }

    setLoading(true);
    try {
      const { data: insertedData, error } = await supabase
        .from('market_prices')
        .insert({
          gold_999_base: goldPerGram,
          silver_base: silverPerGram,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      Alert.alert("Success", `New price entry created! ID: ${insertedData?.[0]?.id ?? 'N/A'}`);

      await loadPriceHistory();
      setCurrentGoldPerGram(goldPerGram);
      setCurrentSilverPerGram(silverPerGram);

      try {
        const { error: fnError } = await supabase.functions.invoke('send-price-update-notification', {
          body: { goldPrice: goldPerGram, silverPrice: silverPerGram },
        });
        if (fnError) logger.warn('Push notification function error:', fnError);
      } catch {
        // Non-critical: function may not be deployed yet
      }
    } catch (error: unknown) {
      logger.error('Error creating entry:', error);
      Alert.alert("Error", (error as Error).message || "Failed to create entry.");
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = createStyles();

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

      {/* TOP NAVIGATION BAR */}
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
            {/* ADMIN CARD */}
            <View style={[dynamicStyles.largeCard, { backgroundColor: colors.cardBackground }]}>
              <View style={dynamicStyles.inputGroup}>
                <Text style={[dynamicStyles.label, { color: colors.text }, getInterFontFeatures()]}>Gold 24K (10 grams rate)</Text>
                <TextInput
                  style={[dynamicStyles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }, getInterFontFeatures()]}
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
                  style={[dynamicStyles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }, getInterFontFeatures()]}
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
                  (arePricesSame() || loading) && { opacity: 0.5 },
                ]}
                onPress={() => {
                  setErrorMessage(null);
                  if (arePricesSame()) {
                    setErrorMessage("The entered prices are the same as the current prices. Please enter different prices to update.");
                    return;
                  }
                  handleUpdate();
                }}
                disabled={loading}
              >
                <Text style={[dynamicStyles.buttonText, { color: arePricesSame() || loading ? colors.textTertiary : colors.buttonText }, getInterFontFeatures()]}>
                  {loading ? "Updating..." : "Update Live Prices"}
                </Text>
              </TouchableOpacity>

              {errorMessage && (
                <Text style={[dynamicStyles.errorText, { color: '#F44336' }, getInterFontFeatures()]}>
                  {errorMessage}
                </Text>
              )}

              {/* Test Notification Button (Web only) */}
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={[dynamicStyles.button, { backgroundColor: colors.buttonBackground, marginTop: 16, opacity: 0.8 }]}
                  onPress={async () => {
                    try {
                      if (typeof window === 'undefined' || !('Notification' in window)) return;
                      const permission = (window as any).Notification.permission;
                      const requested = permission !== 'granted'
                        ? await (window as any).Notification.requestPermission()
                        : permission;
                      if (requested !== 'granted') {
                        Alert.alert('Permission Denied', 'Please allow notifications in your browser settings to receive reminders.');
                        return;
                      }
                      new (window as any).Notification('Test Notification', {
                        body: 'Notifications are working! You will receive reminders at 12pm and 5pm on weekdays.',
                        icon: '/assets/icon.png',
                        tag: 'test-notification',
                      });
                      startWebNotificationSchedule();
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
                                { onConflict: 'endpoint' },
                              );
                            }
                          }
                        } catch (pushErr) {
                          logger.warn('Web Push subscription skipped (optional):', pushErr);
                        }
                      }
                    } catch (error) {
                      logger.error('Error showing test notification:', error);
                      Alert.alert('Error', 'Could not show test notification.');
                    }
                  }}
                >
                  <Text style={[dynamicStyles.buttonText, { color: colors.buttonText }, getInterFontFeatures()]}>
                    Test Notification
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* PRICE HISTORY LOG */}
            {priceHistory.length > 0 && (
              <View style={[dynamicStyles.largeCard, { backgroundColor: colors.cardBackground, marginTop: 0 }]}>
                <Text style={[dynamicStyles.logTitle, { color: colors.text }, getInterFontFeatures()]}>
                  Price History
                </Text>
                <View style={[dynamicStyles.divider, { backgroundColor: colors.divider }]} />
                {priceHistory.map((entry, index) => {
                  const goldDisplay = (entry.gold_999_base * GOLD_PER_GRAM_DIVISOR).toLocaleString('en-IN');
                  const silverDisplay = (entry.silver_base * SILVER_PER_GRAM_DIVISOR).toLocaleString('en-IN');
                  const date = new Date(entry.updated_at);
                  const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

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
                          <Text style={[dynamicStyles.logPriceLabel, { color: colors.textSecondary }, getInterFontFeatures()]}>Gold (10g):</Text>
                          <Text style={[dynamicStyles.logPriceValue, { color: colors.text }, getInterFontFeatures()]}>₹{goldDisplay}</Text>
                        </View>
                        <View style={dynamicStyles.logPriceRow}>
                          <Text style={[dynamicStyles.logPriceLabel, { color: colors.textSecondary }, getInterFontFeatures()]}>Silver (1kg):</Text>
                          <Text style={[dynamicStyles.logPriceValue, { color: colors.text }, getInterFontFeatures()]}>₹{silverDisplay}</Text>
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

const createStyles = () =>
  StyleSheet.create({
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
      paddingHorizontal: 16,
      ...(Platform.OS === 'web' && { maxWidth: 432, alignSelf: 'center' }),
    },
    keyboardView: {
      flex: 1,
      width: '100%',
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
      width: 68,
    },
    adminLabel: {
      fontSize: 12,
      fontFamily: getFontFamily(700),
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      ...(Platform.OS === 'web' && { fontWeight: '700' }),
    },
    scrollContainer: {
      paddingTop: 0,
      paddingBottom: 32,
    },
    largeCard: {
      padding: 32,
      borderRadius: 28,
      marginBottom: 32,
      borderWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      ...(Platform.OS === 'web' && { maxWidth: 400, alignSelf: 'center' }),
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 15,
      fontFamily: getFontFamily(500),
      marginBottom: 12,
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    input: {
      padding: 16,
      borderRadius: 12,
      fontSize: 18,
      borderWidth: 1,
      fontFamily: getFontFamily(500),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
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
      ...(Platform.OS === 'web' && { fontWeight: '700' }),
    },
    errorText: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 20,
      fontFamily: getFontFamily(500),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    logTitle: {
      fontSize: 20,
      fontFamily: getFontFamily(700),
      marginBottom: 16,
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '700' }),
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
      ...(Platform.OS === 'web' && { fontWeight: '600' }),
    },
    logEntryDate: {
      fontSize: 12,
      fontFamily: getFontFamily(400),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '400' }),
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
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    logPriceValue: {
      fontSize: 14,
      fontFamily: getFontFamily(600),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '600' }),
    },
    logDivider: {
      height: 1,
      width: '100%',
      marginTop: 16,
    },
  });
