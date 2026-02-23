import { MetalPriceCard } from '@/components/metal-price-card';
import { historicalPrices } from '@/data/historical-prices';
import { supabase } from '@/lib/supabase';
import { fetchAndUpdateWidget } from '@/lib/widget-background-update';
import type { AppColors, MarketPrice, MetalPriceChange, PriceChange } from '@/types/market';
import { getFontFamily } from '@/utils/font';
import { getInterFontFeatures } from '@/utils/font-features';
import { logger } from '@/utils/logger';
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
const isSharedGroupPreferencesAvailable = (): boolean => {
  try {
    return (
      !!SharedGroupPreferences &&
      typeof SharedGroupPreferences.setItem === 'function' &&
      typeof SharedGroupPreferences.getItem === 'function'
    );
  } catch {
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

const GOLD_PER_GRAM_DIVISOR = 10;
const SILVER_PER_GRAM_DIVISOR = 1000;
const WIDGET_DEBOUNCE_MS = 1500;

export default function GoldApp() {
  const router = useRouter();
  const [data, setData] = useState<MarketPrice | null>(null);
  const [historicalData, setHistoricalData] = useState<MarketPrice[]>([]);
  const [previousPrices, setPreviousPrices] = useState<{ gold: number; silver: number } | null>(null);
  const previousPricesRef = useRef<{ gold: number; silver: number } | null>(null);
  // Prevent concurrent native writes (can crash iOS / Hermes with EXC_BAD_ACCESS)
  const widgetUpdateInFlightRef = useRef(false);
  const lastWidgetUpdateAtRef = useRef(0);
  const fetchPricesInFlightRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'physical' | 'pcx'>('physical');
  const [isLoading, setIsLoading] = useState(true);

  const colors: AppColors = {
    background: '#000000',
    cardBackground: '#FFFFFF',
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
    priceUp: '#4CAF50',
    priceDown: '#F44336',
  };

  const updateWidget = async (
    goldPrice?: number,
    goldChange?: PriceChange,
    silverChange?: PriceChange,
    silverPrice?: number,
  ) => {
    try {
      if (widgetUpdateInFlightRef.current) return;
      const now = Date.now();
      if (now - lastWidgetUpdateAtRef.current < WIDGET_DEBOUNCE_MS) return;
      widgetUpdateInFlightRef.current = true;
      lastWidgetUpdateAtRef.current = now;

      if (Platform.OS !== 'ios') {
        widgetUpdateInFlightRef.current = false;
        return;
      }

      if (!isSharedGroupPreferencesAvailable()) {
        logger.warn('SharedGroupPreferences module not available or not properly linked');
        widgetUpdateInFlightRef.current = false;
        return;
      }

      let priceToUse = goldPrice;

      if (!priceToUse && historicalData.length > 0) {
        const latestEntry = historicalData[0] as any;
        priceToUse = (latestEntry.gold_price_pm ?? latestEntry.goldPricePM ?? 0) / GOLD_PER_GRAM_DIVISOR;
      }

      if (!priceToUse && historicalPrices.length > 0) {
        priceToUse = historicalPrices[0].goldPricePM / GOLD_PER_GRAM_DIVISOR;
      }

      if (!priceToUse || priceToUse <= 0) {
        widgetUpdateInFlightRef.current = false;
        return;
      }

      const roundedPrice = Math.round(priceToUse);
      const widgetPrice = `₹${(roundedPrice * GOLD_PER_GRAM_DIVISOR).toLocaleString('en-IN')}`;

      let silverPricePerGram = silverPrice ?? data?.silver_base ?? 0;
      if (silverPricePerGram === 0) {
        try {
          await new Promise<void>((resolve) => {
            InteractionManager.runAfterInteractions(async () => {
              try {
                const stored = await SharedGroupPreferences.getItem('silverPrice', APP_GROUP);
                if (stored && typeof stored === 'string') {
                  const numericStr = stored.replace(/[₹,]/g, '');
                  silverPricePerGram = parseFloat(numericStr) / SILVER_PER_GRAM_DIVISOR;
                }
              } catch {
                // Use 0 as fallback
              }
              resolve();
            });
          });
        } catch {
          // Use 0 as fallback
        }
      }

      const widgetSilverPrice = `₹${Math.round(silverPricePerGram * SILVER_PER_GRAM_DIVISOR).toLocaleString('en-IN')}`;
      const goldChangePct = goldChange?.percentage ?? 0;
      const silverChangePct = silverChange?.percentage ?? 0;
      const goldChangeDiff = goldChange?.difference ?? 0;
      const silverChangeDiff = silverChange?.difference ?? 0;
      const goldChangeDirection = goldChange?.direction ?? null;
      const silverChangeDirection = silverChange?.direction ?? null;

      const goldDirToWrite = (goldChangeDirection === 'up' || goldChangeDirection === 'down') ? String(goldChangeDirection) : '';
      const silverDirToWrite = (silverChangeDirection === 'up' || silverChangeDirection === 'down') ? String(silverChangeDirection) : '';

      try {
        await SharedGroupPreferences.setItem('currentPrice', String(widgetPrice), APP_GROUP);
        await SharedGroupPreferences.setItem('silverPrice', String(widgetSilverPrice), APP_GROUP);
        await SharedGroupPreferences.setItem('goldChange', String(goldChangePct), APP_GROUP);
        await SharedGroupPreferences.setItem('silverChange', String(silverChangePct), APP_GROUP);
        await SharedGroupPreferences.setItem('goldChangeDiff', String(goldChangeDiff), APP_GROUP);
        await SharedGroupPreferences.setItem('silverChangeDiff', String(silverChangeDiff), APP_GROUP);
        await SharedGroupPreferences.setItem('goldChangeDirection', goldDirToWrite, APP_GROUP);
        await SharedGroupPreferences.setItem('silverChangeDirection', silverDirToWrite, APP_GROUP);
        await SharedGroupPreferences.setItem('widgetDataLoaded', 'true', APP_GROUP);

        if (ExtensionStorage && typeof ExtensionStorage.reloadWidget === 'function') {
          try {
            ExtensionStorage.reloadWidget();
          } catch (reloadError) {
            logger.warn('Widget reload failed:', reloadError);
          }
        }
      } catch (saveError) {
        logger.warn('Widget update write failed:', saveError);
      }
    } catch (widgetError) {
      logger.warn('Widget update failed:', widgetError);
    } finally {
      widgetUpdateInFlightRef.current = false;
    }
  };

  const fetchPrices = async () => {
    try {
      if (fetchPricesInFlightRef.current) return;
      fetchPricesInFlightRef.current = true;
      if (!data) setIsLoading(true);

      const { data: entries, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(2);

      if (error) {
        const msg = error.message ?? '';
        const code = (error as any)?.code ?? '';
        const isNetworkError = msg.includes('network') || msg.includes('offline') || code === 'PGRST116';
        if (isNetworkError) {
          setIsLoading(false);
          return;
        }
        throw error;
      }

      if (!entries || entries.length === 0) {
        setIsLoading(false);
        await updateWidget();
        return;
      }

      const latestEntry: MarketPrice = entries[0];
      const previousEntry: MarketPrice = entries.length > 1 ? entries[1] : entries[0];

      const oldPrice = {
        gold: previousEntry.gold_999_base ?? 0,
        silver: previousEntry.silver_base ?? 0,
      };

      setPreviousPrices(oldPrice);
      previousPricesRef.current = oldPrice;
      setData(latestEntry);
      setIsLoading(false);

      const goldPriceForWidget =
        typeof latestEntry.gold_999_base === 'string'
          ? parseFloat(latestEntry.gold_999_base)
          : latestEntry.gold_999_base;

      const silverPriceForWidget =
        typeof latestEntry.silver_base === 'string'
          ? parseFloat(latestEntry.silver_base)
          : latestEntry.silver_base ?? 0;

      const priceChange = calculatePriceChangeFromEntries(latestEntry, previousEntry);

      if (goldPriceForWidget && !isNaN(goldPriceForWidget) && goldPriceForWidget > 0) {
        await updateWidget(goldPriceForWidget, priceChange?.gold, priceChange?.silver, silverPriceForWidget);
      } else {
        await updateWidget(undefined, priceChange?.gold, priceChange?.silver, silverPriceForWidget);
      }
    } catch (e) {
      logger.error('Error fetching prices:', e);
      setIsLoading(false);
      const msg = (e as Error)?.message ?? '';
      const code = (e as any)?.code ?? '';
      const isNetworkError =
        msg.includes('network') || msg.includes('offline') || msg.includes('fetch') || code === 'PGRST116';
      if (!isNetworkError || !data) {
        await updateWidget();
      }
    } finally {
      fetchPricesInFlightRef.current = false;
    }
  };

  const fetchHistoricalPrices = async () => {
    try {
      const { data: historical, error } = await supabase
        .from('historical_prices')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) return;

      if (historical && historical.length > 0) {
        setHistoricalData(historical);
      }
    } catch {
      // Silent: historical data is optional — static fallback exists
    }
  };

  useEffect(() => {
    if (historicalPrices.length > 0 && Platform.OS === 'ios') {
      const initialPrice = historicalPrices[0].goldPricePM / GOLD_PER_GRAM_DIVISOR;
      setTimeout(() => {
        updateWidget(initialPrice).catch((err) => logger.warn('Initial widget update failed:', err));
      }, 500);
    }

    fetchPrices();
    fetchHistoricalPrices();

    const channel = supabase
      .channel('market_prices_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_prices' }, async () => {
        await fetchPrices();
      })
      .subscribe();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        fetchPrices();
      }
    });

    const pollingInterval = setInterval(() => {
      fetchPrices();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      subscription.remove();
      clearInterval(pollingInterval);
    };
  }, []);

  // Update widget when historical data arrives but we have no live data yet
  useEffect(() => {
    if (historicalData.length > 0 && !data && Platform.OS === 'ios') {
      const latestEntry = historicalData[0] as any;
      const goldPrice = (latestEntry.gold_price_pm ?? latestEntry.goldPricePM ?? 0) / GOLD_PER_GRAM_DIVISOR;
      updateWidget(goldPrice).catch((err) => logger.warn('Historical widget update failed:', err));
    }
  }, [historicalData]);

  // Register Background App Refresh (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    (async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_BACKGROUND_TASK);
        if (!isRegistered) {
          await BackgroundFetch.registerTaskAsync(WIDGET_BACKGROUND_TASK, {
            minimumInterval: 60 * 15,
          });
        }
      } catch (e) {
        logger.warn('Background App Refresh registration failed:', e);
      }
    })();
  }, []);

  // Register for push notifications (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const registerForPushNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '05f18532-8f5b-432d-8fc5-1ed619a84a05',
          });

          await supabase.from('device_tokens').upsert(
            { token: tokenData.data, platform: 'ios', updated_at: new Date().toISOString() },
            { onConflict: 'token' },
          );
        } catch {
          // Token fetch / save failure is non-critical
        }

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const notifSub = Notifications.addNotificationReceivedListener(() => {
          fetchPrices();
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
          fetchPrices();
        });

        return () => {
          notifSub.remove();
          responseSub.remove();
        };
      } catch (e) {
        logger.error('Error registering for push notifications:', e);
      }
    };

    registerForPushNotifications();
  }, []);

  const getLatestHistoricalPrices = () => {
    if (historicalData.length > 0) {
      const latestEntry = historicalData[0] as any;
      return {
        goldPerGram: (latestEntry.gold_price_pm ?? latestEntry.goldPricePM ?? 0) / GOLD_PER_GRAM_DIVISOR,
        silverPerGram: (latestEntry.silver_price_pm ?? latestEntry.silverPricePM ?? 0) / SILVER_PER_GRAM_DIVISOR,
      };
    }
    if (!historicalPrices.length) return null;
    return {
      goldPerGram: historicalPrices[0].goldPricePM / GOLD_PER_GRAM_DIVISOR,
      silverPerGram: historicalPrices[0].silverPricePM / SILVER_PER_GRAM_DIVISOR,
    };
  };

  const goldBase = data?.gold_999_base ?? null;
  const silverBase = data?.silver_base ?? null;

  const calculatePriceChangeFromEntries = (
    currentEntry: MarketPrice,
    previousEntry: MarketPrice,
  ): MetalPriceChange | null => {
    if (!currentEntry) return null;

    const currentGold10g = (currentEntry.gold_999_base ?? 0) * GOLD_PER_GRAM_DIVISOR;
    const currentSilver1kg = (currentEntry.silver_base ?? 0) * SILVER_PER_GRAM_DIVISOR;
    const previousGold10g = (previousEntry?.gold_999_base ?? 0) * GOLD_PER_GRAM_DIVISOR;
    const previousSilver1kg = (previousEntry?.silver_base ?? 0) * SILVER_PER_GRAM_DIVISOR;

    const goldDifference10g = currentGold10g - previousGold10g;
    const silverDifference1kg = currentSilver1kg - previousSilver1kg;

    const goldDifferencePerGram = Math.abs(goldDifference10g) / GOLD_PER_GRAM_DIVISOR;
    const goldPercentage =
      previousGold10g > 0 ? (goldDifferencePerGram / (previousGold10g / GOLD_PER_GRAM_DIVISOR)) * 100 : 0;

    const silverDifference = Math.abs(silverDifference1kg);
    const silverPercentage = previousSilver1kg > 0 ? (silverDifference / previousSilver1kg) * 100 : 0;

    const goldDirection: PriceChange['direction'] =
      goldDifference10g > 0.01 ? 'up' : goldDifference10g < -0.01 ? 'down' : null;
    const silverDirection: PriceChange['direction'] =
      silverDifference1kg > 0.01 ? 'up' : silverDifference1kg < -0.01 ? 'down' : null;

    return {
      gold: { direction: goldDirection, difference: goldDifferencePerGram, percentage: goldPercentage },
      silver: { direction: silverDirection, difference: silverDifference, percentage: silverPercentage },
    };
  };

  const getPriceChangeFromDatabase = (): MetalPriceChange | null => {
    if (!data || isLoading) return null;

    const currentGold10g = (data.gold_999_base ?? 0) * GOLD_PER_GRAM_DIVISOR;
    const currentSilver1kg = (data.silver_base ?? 0) * SILVER_PER_GRAM_DIVISOR;

    let previousGold10g = currentGold10g;
    let previousSilver1kg = currentSilver1kg;

    const prevPrices = previousPricesRef.current ?? previousPrices;
    if (prevPrices) {
      previousGold10g = prevPrices.gold * GOLD_PER_GRAM_DIVISOR;
      previousSilver1kg = prevPrices.silver * SILVER_PER_GRAM_DIVISOR;
    } else if (historicalData.length > 1) {
      const prevEntry = historicalData[1] as any;
      previousGold10g = prevEntry.gold_price_pm ?? prevEntry.goldPricePM ?? 0;
      previousSilver1kg = prevEntry.silver_price_pm ?? prevEntry.silverPricePM ?? 0;
    } else if (historicalPrices.length > 1) {
      previousGold10g = historicalPrices[1].goldPricePM ?? 0;
      previousSilver1kg = historicalPrices[1].silverPricePM ?? 0;
    }

    const goldDifference10g = currentGold10g - previousGold10g;
    const silverDifference1kg = currentSilver1kg - previousSilver1kg;

    const goldDifferencePerGram = Math.abs(goldDifference10g) / GOLD_PER_GRAM_DIVISOR;
    const goldPercentage = previousGold10g > 0 ? (goldDifferencePerGram / previousGold10g) * 100 : 0;

    const silverDifference = Math.abs(silverDifference1kg);
    const silverPercentage = previousSilver1kg > 0 ? (silverDifference / previousSilver1kg) * 100 : 0;

    const goldDirection: PriceChange['direction'] = goldDifference10g > 0 ? 'up' : goldDifference10g < 0 ? 'down' : null;
    const silverDirection: PriceChange['direction'] =
      silverDifference1kg > 0 ? 'up' : silverDifference1kg < 0 ? 'down' : null;

    return {
      gold: { direction: goldDirection, difference: goldDifferencePerGram, percentage: goldPercentage },
      silver: { direction: silverDirection, difference: silverDifference, percentage: silverPercentage },
    };
  };

  const dbPriceChange = getPriceChangeFromDatabase();
  const goldChange: PriceChange = dbPriceChange?.gold ?? { direction: null, difference: 0, percentage: 0 };
  const silverChange: PriceChange = dbPriceChange?.silver ?? { direction: null, difference: 0, percentage: 0 };

  const getLatestUpdateDate = (): Date | null => {
    if (historicalData.length > 0) {
      const latestEntry = historicalData[0] as any;
      const dateStr: string | undefined = latestEntry.date ?? latestEntry.created_at ?? latestEntry.updated_at;
      if (dateStr) {
        return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T17:00:00`);
      }
    }
    if (data?.updated_at) return new Date(data.updated_at);
    if (!historicalPrices.length) return null;
    return new Date(`${historicalPrices[0].date}T17:00:00`);
  };

  const latestUpdateDate = getLatestUpdateDate();
  const today = new Date();
  const isTodayWeekend = today.getDay() === 0 || today.getDay() === 6;

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
                    <View style={dynamicStyles.dateTimeCardContent}>
                      <View style={dynamicStyles.dateTimeTextContainer}>
                        <View style={{ width: 120, height: 18, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, alignSelf: 'center', marginBottom: 6 }} />
                        <View style={{ width: 200, height: 18, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, alignSelf: 'center' }} />
                      </View>
                    </View>
                  ) : (() => {
                    const formattedDay = latestUpdateDate.toLocaleDateString('en-IN', { weekday: 'long' });
                    const formattedDate = latestUpdateDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    const formattedTime = latestUpdateDate.toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit', hour12: true,
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
                  })()}
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

              <View style={[dynamicStyles.largeCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 32 }]}>
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

          {/* Web-only: Support & Privacy links */}
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
    </View>
  );
}

const createStyles = (colors: AppColors, insets?: { top: number; bottom: number }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      ...(Platform.OS === 'web' && { alignItems: 'center' }),
    },
    navBarWrapper: {
      width: '100%',
      alignItems: 'center',
    },
    contentWrapper: {
      flex: 1,
      width: '100%',
      ...(Platform.OS === 'web' && {
        paddingHorizontal: 16,
        maxWidth: 432,
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
      paddingTop: 0,
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
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    navTitle: {
      fontSize: 30,
      fontFamily: getFontFamily(900),
      textAlign: 'center',
      textTransform: 'lowercase',
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '900' }),
    },
    navLogo: {
      height: 39,
      width: 88.4,
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
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    weekendNote: {
      fontSize: 15,
      fontFamily: getFontFamily(500),
      lineHeight: 18,
      letterSpacing: -0.02,
      textAlign: 'center',
      alignSelf: 'center',
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingTop:
        Platform.OS === 'ios'
          ? (insets?.top ? insets.top + 20 : 60)
          : Platform.OS === 'android'
          ? (insets?.top ? insets.top + 20 : 50)
          : 0,
      paddingBottom:
        Platform.OS === 'ios'
          ? (insets?.bottom ? insets.bottom + 20 : 40)
          : Platform.OS === 'android'
          ? (insets?.bottom ? insets.bottom + 20 : 32)
          : 0,
      ...(Platform.OS === 'web' && {
        paddingHorizontal: 0,
        paddingTop: 16,
        paddingBottom: 32,
      }),
    },
    largeCard: {
      padding: 24,
      borderRadius: 28,
      marginBottom: 32,
      borderWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      ...(Platform.OS === 'web' && { width: 400, alignSelf: 'center' }),
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
    cardHeaderTitle: {
      fontSize: 20,
      color: '#1A1A1A',
      fontFamily: getFontFamily(600),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '600' }),
    },
    cardPriceContainer: {
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 4,
    },
    cardHeaderPrice: {
      fontSize: 28,
      fontFamily: getFontFamily(800),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '800' }),
    },
    priceIndicator: {
      marginTop: 4,
      alignItems: 'center',
    },
    priceChangeText: {
      fontSize: 12,
      fontFamily: getFontFamily(500),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    cardHeaderSubtitle: {
      fontSize: 12,
      fontFamily: getFontFamily(400),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '400' }),
    },
    cardDivider: {
      height: 1,
      width: '100%',
      marginBottom: 32,
    },
    purityList: {
      gap: 16,
      marginTop: 10,
    },
    purityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    purityLabel: {
      fontSize: 15,
      fontFamily: getFontFamily(500),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    purityPrice: {
      fontSize: 15,
      fontFamily: getFontFamily(500),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    cardFooter: {
      fontSize: 12,
      marginTop: 20,
      fontFamily: getFontFamily(400),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '400' }),
    },
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
      ...(Platform.OS === 'web' && { maxWidth: 400, alignSelf: 'center' }),
    },
    historyButtonText: {
      fontSize: 14,
      fontFamily: getFontFamily(600),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '600' }),
    },
    footerCard: {
      marginBottom: 0,
    },
    lastUpdated: {
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 24,
      fontFamily: getFontFamily(500),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '500' }),
    },
    bottomNav: {
      position: 'absolute',
      bottom: 20,
      width: '100%',
      ...(Platform.OS === 'web' && { maxWidth: 464, width: 400 }),
      alignSelf: 'center',
      flexDirection: 'row',
      padding: 12,
      paddingHorizontal: 32,
      borderRadius: 36,
      borderWidth: 0,
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
    bottomNavTabActive: {},
    bottomNavTabText: {
      fontSize: 14,
      fontFamily: getFontFamily(600),
      letterSpacing: -0.02,
      ...(Platform.OS === 'web' && { fontWeight: '600' }),
    },
  });
