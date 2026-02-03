import { SimpleLineChart } from '@/components/simple-line-chart';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { getInterFontFeatures } from '@/utils/font-features';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

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
  
  return weightMap[weight] || 'Inter-Regular';
};

interface HistoricalPrice {
  date: string;
  goldPriceAM: number; // 10 grams rate (AM/Opening)
  goldPricePM: number; // 10 grams rate (PM/Closing)
  silverPriceAM: number; // 1kg rate (AM/Opening)
  silverPricePM: number; // 1kg rate (PM/Closing)
}

export default function PriceHistoryPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'gold' | 'silver'>('gold');
  const [range, setRange] = useState<'7D' | '15D' | '30D'>('7D');
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  // Only use DB data for chart – no static/fallback so we never show stale numbers (e.g. 14159)
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const chartDataSourceRef = useRef<'priceHistory' | 'historicalData' | null>(null);
  // Start at 0 so we never show numbers until onLayout gives real width and we have real data
  const [chartWidth, setChartWidth] = useState<number>(0);

  const colors = {
    background: '#000000',
    cardBackground: '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    textTertiary: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    divider: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    priceUp: '#4CAF50',
    priceDown: '#F44336',
    iconBackground: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
  };

  // Fetch historical data from historical_prices table only – no static fallback
  useEffect(() => {
    const fetchHistoricalPrices = async () => {
      try {
        const { data: historical, error } = await supabase
          .from('historical_prices')
          .select('*')
          .order('date', { ascending: false })
          .limit(365);
        
        if (error) {
          console.log('📊 historical_prices error:', error.message);
          return;
        }
        
        if (historical && historical.length > 0) {
          const mappedData = historical.map((item: any) => {
            const silverAM = item.silver_price_am || item.silverPriceAM || 0;
            const silverPM = item.silver_price_pm || item.silverPricePM || 0;
            const silverAMPerKilo = silverAM < 1000 ? silverAM * 1000 : silverAM;
            const silverPMPerKilo = silverPM < 1000 ? silverPM * 1000 : silverPM;
            return {
              date: item.date || item.created_at?.split('T')[0] || '',
              goldPriceAM: item.gold_price_am || item.goldPriceAM || 0,
              goldPricePM: item.gold_price_pm || item.goldPricePM || 0,
              silverPriceAM: silverAMPerKilo,
              silverPricePM: silverPMPerKilo,
            };
          });
          setHistoricalData(mappedData);
        }
      } catch (e) {
        console.error('❌ fetchHistoricalPrices:', e);
      }
    };
    fetchHistoricalPrices();
  }, []);

  // Fetch price history from market_prices table
  useEffect(() => {
    const loadPriceHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data: historyData, error } = await supabase
          .from('market_prices')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(100);
        
        if (error) {
          console.error('❌ Error loading price history:', error);
          setPriceHistory([]);
          setLoadingHistory(false);
          return;
        }
        
        if (historyData && historyData.length > 0) {
          const validData = historyData.filter((entry: any) => 
            entry && 
            entry.id && 
            entry.updated_at &&
            (entry.gold_999_base !== undefined || entry.silver_base !== undefined)
          );
          setPriceHistory(validData);
        } else {
          setPriceHistory([]);
        }
      } catch (error) {
        console.error('❌ Error loading price history:', error);
        setPriceHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    loadPriceHistory();
  }, []);

  // Filter valid price history entries
  const filteredPriceHistory = useMemo(() => {
    if (priceHistory.length === 0) {
      return [];
    }
    
    return priceHistory.filter((entry: any) => {
      if (!entry || !entry.id || !entry.updated_at) {
        return false;
      }
      const date = new Date(entry.updated_at);
      return !isNaN(date.getTime());
    });
  }, [priceHistory]);

  const rangeDays = useMemo(() => {
    switch (range) {
      case '7D':
        return 7;
      case '15D':
        return 15;
      case '30D':
        return 30;
      default:
        return 15;
    }
  }, [range]);

  // Today in local YYYY-MM-DD (so chart can extend to "today" when data stops earlier)
  const getTodayLocalYYYYMMDD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Only append today's point when we actually have an entry for today (in user's local date).
  // Do not reuse yesterday's price and label it as today.
  const appendTodayIfNeeded = (series: any[], latestMarketPrice: any): any[] => {
    if (series.length === 0 || !latestMarketPrice?.updated_at) return series;
    const todayStr = getTodayLocalYYYYMMDD();
    // Use local date of the entry so we don't show "today" when the only data is from yesterday
    const entryDate = latestMarketPrice.updated_at
      ? new Date(latestMarketPrice.updated_at)
      : latestMarketPrice.date
        ? new Date(latestMarketPrice.date)
        : null;
    const latestEntryDate = entryDate
      ? `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`
      : latestMarketPrice.updated_at?.split('T')[0] || latestMarketPrice.date || '';
    if (latestEntryDate !== todayStr) return series; // No price for today yet – don't add it
    const lastDate = series[series.length - 1]?.date;
    if (!lastDate || lastDate >= todayStr) return series;
    const gold10 = (latestMarketPrice.gold_999_base ?? 0) * 10;
    const silver1k = (latestMarketPrice.silver_base ?? 0) * 1000;
    return [
      ...series,
      {
        date: todayStr,
        goldPriceAM: gold10,
        goldPricePM: gold10,
        silverPriceAM: silver1k,
        silverPricePM: silver1k,
      },
    ];
  };

  // Convert priceHistory (market_prices table) to chart format
  const chartDataFromPriceHistory = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return null;
    }
    
    const converted = priceHistory
      .filter((item: any) => item && item.updated_at && (item.gold_999_base !== undefined || item.silver_base !== undefined))
      .map((item: any) => {
        const dateStr = item.updated_at ? item.updated_at.split('T')[0] : '';
        return {
          date: dateStr,
          updated_at: item.updated_at,
          goldPriceAM: (item.gold_999_base || 0) * 10,
          goldPricePM: (item.gold_999_base || 0) * 10,
          silverPriceAM: (item.silver_base || 0) * 1000,
          silverPricePM: (item.silver_base || 0) * 1000,
        };
      });
    
    if (converted.length === 0) {
      return null;
    }
    
    const groupedByDate = new Map<string, any>();
    
    converted.forEach((item: any) => {
      const dateKey = item.date;
      if (!dateKey) return;
      
      const existing = groupedByDate.get(dateKey);
      if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
        groupedByDate.set(dateKey, item);
      }
    });
    
    const uniqueDays = Array.from(groupedByDate.values()).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    return uniqueDays.length > 0 ? uniqueDays : null;
  }, [priceHistory]);

  // Format data for chart – only DB data (market_prices or historical_prices), no static/fallback
  const chartData = useMemo(() => {
    let dataToUse: any = null;
    let source: 'priceHistory' | 'historicalData' | null = null;

    if (chartDataFromPriceHistory && chartDataFromPriceHistory.length > 0) {
      dataToUse = chartDataFromPriceHistory;
      source = 'priceHistory';
    } else if (historicalData && historicalData.length > 0) {
      dataToUse = historicalData;
      source = 'historicalData';
    }

    if (source) {
      chartDataSourceRef.current = source;
    }
    
    if (!dataToUse || dataToUse.length === 0) {
      return null;
    }
    
    const validData = dataToUse.filter((item) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime());
    });
    
    if (validData.length === 0) {
      return null;
    }
    
    // Step 1: Deduplicate by date (keep the most recent entry per date)
    // Group by date string (YYYY-MM-DD) and keep the entry with the most recent timestamp
    const dateMap = new Map<string, any>();
    validData.forEach((item) => {
      if (!item.date) return;
      const dateStr = typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0];
      const existing = dateMap.get(dateStr);
      if (!existing) {
        dateMap.set(dateStr, item);
      } else {
        // If we have updated_at, prefer the more recent one
        const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
        const itemTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        if (itemTime > existingTime) {
          dateMap.set(dateStr, item);
        }
      }
    });
    
    // Step 2: Convert to array and sort by date descending (newest first)
    const uniqueDays = Array.from(dateMap.values()).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending: newest first
    });
    
    // Step 3: Take the most recent N unique days (7, 15, or 30)
    const recentDays = uniqueDays.slice(0, rangeDays);
    
    if (recentDays.length === 0) {
      // If no data, show all available data (up to rangeDays entries, but show all if less)
      if (uniqueDays.length > 0) {
        // Show all available unique days, sorted ascending
        let allSeries = [...uniqueDays].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB; // Ascending: oldest first
        });
        const latestMarket = priceHistory?.length > 0 ? priceHistory[0] : null;
        allSeries = appendTodayIfNeeded(allSeries, latestMarket);
        const allLabels = allSeries.map((item) => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        });
        
        if (activeTab === 'gold') {
          const prices = allSeries.map((item) => item.goldPricePM / 10);
          const firstPrice = prices[0];
          const percentageChanges = prices.map((price) => 
            firstPrice !== 0 ? ((price - firstPrice) / firstPrice) * 100 : 0
          );
          return { labels: allLabels, prices: percentageChanges, color: 'rgba(0, 0, 0, 0.85)', label: 'Gold (per gram)', raw: allSeries, actualPrices: prices, dates: allSeries.map((item) => item.date) };
        } else {
          const prices = allSeries.map((item) => {
            let silverPM = item.silverPricePM || 0;
            if (silverPM > 0 && silverPM < 1000) {
              return silverPM * 1000;
            }
            return silverPM;
          });
          const firstPrice = prices[0];
          const percentageChanges = prices.map((price) => 
            firstPrice !== 0 ? ((price - firstPrice) / firstPrice) * 100 : 0
          );
          return { labels: allLabels, prices: percentageChanges, color: 'rgba(0, 0, 0, 0.65)', label: 'Silver (per kilo)', raw: allSeries, actualPrices: prices, dates: allSeries.map((item) => item.date) };
        }
      }
      return null;
    }

    // Step 4: Sort ascending (oldest to newest) for chart display
    let series = [...recentDays].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB; // Ascending: oldest first
    });
    
    // Step 5: Extend to "today" when latest data is before today (so graph shows through 28 Jan, not just 16 Jan)
    const latestMarket = priceHistory?.length > 0 ? priceHistory[0] : null;
    series = appendTodayIfNeeded(series, latestMarket);
    
    const labels = series.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    
    if (activeTab === 'gold') {
      const prices = series.map((item) => item.goldPricePM / 10);
      const firstPrice = prices[0];
      const percentageChanges = prices.map((price) => 
        firstPrice !== 0 ? ((price - firstPrice) / firstPrice) * 100 : 0
      );
      return { labels, prices: percentageChanges, color: 'rgba(0, 0, 0, 0.85)', label: 'Gold (per gram)', raw: series, actualPrices: prices, dates: series.map((item) => item.date) };
    } else {
      const isUsingPriceHistory = dataToUse === chartDataFromPriceHistory;
      const prices = series.map((item) => {
        let silverPM = item.silverPricePM || 0;
        if (isUsingPriceHistory) {
          return silverPM;
        } else {
          if (silverPM > 0 && silverPM < 1000) {
            return silverPM * 1000;
          }
          return silverPM;
        }
      });
      const firstPrice = prices[0];
      const percentageChanges = prices.map((price) => 
        firstPrice !== 0 ? ((price - firstPrice) / firstPrice) * 100 : 0
      );
      console.log('📊 Silver chart data:', { labelsCount: labels.length, pricesCount: prices.length, firstPrice, lastPrice: prices[prices.length - 1] });
      return { labels, prices: percentageChanges, color: 'rgba(0, 0, 0, 0.65)', label: 'Silver (per kilo)', raw: series, actualPrices: prices, dates: series.map((item) => item.date) };
    }
  }, [chartDataFromPriceHistory, historicalData, activeTab, rangeDays, loadingHistory, priceHistory]);

  // Auto-select the most recent entry
  useEffect(() => {
    if (chartData && chartData.actualPrices && chartData.actualPrices.length > 0) {
      const lastIndex = chartData.actualPrices.length - 1;
      setSelectedPointIndex(lastIndex);
    }
  }, [chartData, range]);

  const dynamicStyles = createStyles(colors);
  const selectedValue = selectedPointIndex !== null && chartData?.actualPrices ? chartData.actualPrices[selectedPointIndex] : null;
  const selectedPercentage = selectedPointIndex !== null && chartData?.prices ? chartData.prices[selectedPointIndex] : null;
  
  const currentValue = selectedValue !== null ? selectedValue : (chartData?.actualPrices?.length ? chartData.actualPrices[chartData.actualPrices.length - 1] : null);
  
  const displayDate = selectedPointIndex !== null && chartData?.dates ? (() => {
    const date = new Date(chartData.dates[selectedPointIndex]);
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  })() : (() => {
    const today = new Date();
    const day = today.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[today.getMonth()];
    return `${day} ${month}`;
  })();
  
  const firstValue = chartData?.actualPrices?.length ? chartData.actualPrices[0] : null;
  const delta = currentValue !== null && firstValue !== null ? currentValue - firstValue : null;
  const deltaPct = selectedPercentage !== null ? selectedPercentage : (currentValue !== null && firstValue !== null && firstValue !== 0 ? (delta! / firstValue) * 100 : null);

  return (
    <View style={dynamicStyles.container}>
      {/* Close button - absolutely positioned */}
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={dynamicStyles.closeButton}
        activeOpacity={0.7}
      >
        {Platform.OS === 'web' ? (
          <Text style={dynamicStyles.closeButtonText}>×</Text>
        ) : (
          <Ionicons name="close" size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      <ScrollView 
        style={dynamicStyles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* First Card: Graph Card with Tabs */}
        {chartData ? (
          <View style={[dynamicStyles.card, dynamicStyles.cardGraph]}>
            {/* Padded section: tabs, header (graph has its own full-width section below) */}
            <View style={dynamicStyles.cardPaddedSection}>
            {/* Tab Selector */}
            <View style={dynamicStyles.tabContainer}>
              <TouchableOpacity
                style={dynamicStyles.tab}
                onPress={() => {
                  setActiveTab('gold');
                  setSelectedPointIndex(null);
                }}
              >
                <Text style={[
                  dynamicStyles.tabText,
                  { color: activeTab === 'gold' ? '#000000' : 'rgba(0,0,0,0.4)' }
                ]}>
                  Gold
                </Text>
                {activeTab === 'gold' && (
                  <View style={dynamicStyles.tabUnderlineWrapper}>
                    <View style={dynamicStyles.tabUnderline} />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.tab}
                onPress={() => {
                  setActiveTab('silver');
                  setSelectedPointIndex(null);
                }}
              >
                <Text style={[
                  dynamicStyles.tabText,
                  { color: activeTab === 'silver' ? '#000000' : 'rgba(0,0,0,0.4)' }
                ]}>
                  Silver
                </Text>
                {activeTab === 'silver' && (
                  <View style={dynamicStyles.tabUnderlineWrapper}>
                    <View style={dynamicStyles.tabUnderline} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={dynamicStyles.tabSeparator} />
            
            <View style={dynamicStyles.chartHeaderRow}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {chartWidth === 0 ? (
                  /* Loader: grey boxes only, never placeholder numbers */
                  <>
                    <View style={dynamicStyles.chartHeaderPlaceholder} />
                    <View style={[dynamicStyles.chartHeaderPlaceholder, { width: 120, height: 28, marginTop: 6 }]} />
                    <View style={[dynamicStyles.chartHeaderPlaceholder, { width: 60, height: 18, marginTop: 8 }]} />
                  </>
                ) : chartData && currentValue !== null ? (
                  <>
                    {displayDate && (
                      <Text style={dynamicStyles.chartDateText}>
                        {displayDate}
                      </Text>
                    )}
                    <Text style={dynamicStyles.chartBigValue}>
                      <Text style={{ fontWeight: 500, fontFamily: getFontFamily(500), marginRight: 1, letterSpacing: -0.02 }}>₹</Text>
                      <Text style={{ fontWeight: 500, fontFamily: getFontFamily(500), letterSpacing: -0.02 }}>
                        {Math.round(currentValue).toLocaleString('en-IN')}
                      </Text>
                    </Text>
                    {deltaPct !== null && (
                      <View style={dynamicStyles.chartDeltaRowLeft}>
                        <View style={dynamicStyles.deltaPill}>
                          <Text
                            style={[
                              dynamicStyles.deltaText,
                              { 
                                color: deltaPct >= 0 ? '#4CAF50' : '#F44336',
                                fontSize: 12,
                                marginRight: 2,
                              },
                            ]}
                          >
                            {deltaPct >= 0 ? '↗' : '↘'}
                          </Text>
                          <Text
                            style={[
                              dynamicStyles.deltaText,
                              { color: deltaPct >= 0 ? '#4CAF50' : '#F44336' },
                            ]}
                          >
                            {`${Math.abs(deltaPct).toFixed(2)}%`}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : null}
              </View>
            </View>
            </View>

            {/* Chart - full width of card. Same layout on iOS, Android, web: onLayout gives card width at any screen size / orientation. */}
            <View
              style={dynamicStyles.graphContainer}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                if (width > 0) {
                  setChartWidth(width);
                }
              }}
            >
              {!chartData || !chartData.prices || chartData.prices.length === 0 ? (
                <View style={dynamicStyles.chartAreaPlaceholder}>
                  <View style={dynamicStyles.chartAreaPlaceholderBar} />
                  <View style={dynamicStyles.chartAreaPlaceholderBar} />
                  <View style={dynamicStyles.chartAreaPlaceholderBar} />
                </View>
              ) : chartWidth > 0 ? (
                <SimpleLineChart
                  data={chartData.prices}
                  labels={chartData.labels}
                  color={chartData.color}
                  width={chartWidth}
                  height={260}
                  fill
                  showPoints={false}
                  gridColor="rgba(0,0,0,0.06)"
                  labelColor="rgba(0,0,0,0.35)"
                  showYAxis={false}
                  selectedPrice={selectedPointIndex !== null && chartData?.actualPrices ? chartData.actualPrices[selectedPointIndex] : null}
                  selectedPercentage={selectedPointIndex !== null && chartData ? chartData.prices[selectedPointIndex] : null}
                  selectedPointX={selectedPointIndex !== null && chartData ? null : null}
                  selectedPointY={selectedPointIndex !== null && chartData ? null : null}
                  selectedDate={selectedPointIndex !== null && chartData?.dates ? (() => {
                    const date = new Date(chartData.dates[selectedPointIndex]);
                    const day = date.getDate();
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames[date.getMonth()];
                    return `${day} ${month}`;
                  })() : null}
                  scrollOffset={scrollOffset}
                  onScrollOffsetChange={setScrollOffset}
                  onPointSelect={(index, value) => {
                    try {
                      // Handle both callback signatures (index only or index + value)
                      setSelectedPointIndex(typeof index === 'number' ? index : null);
                    } catch (error) {
                      console.error('Error selecting point:', error);
                    }
                  }}
                />
              ) : null}
            </View>

            {/* Padded section: range row */}
            <View style={dynamicStyles.cardPaddedSection}>
            <View style={dynamicStyles.rangeRow}>
              {(['7D', '15D', '30D'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    try {
                      setRange(r);
                      setSelectedPointIndex(null);
                      setScrollOffset(0);
                    } catch (error) {
                      console.error('Error updating range:', error);
                    }
                  }}
                  activeOpacity={0.7}
                  style={[
                    dynamicStyles.rangeChip,
                    range === r && dynamicStyles.rangeChipActive,
                  ]}
                >
                  <Text style={[dynamicStyles.rangeChipText, range === r && dynamicStyles.rangeChipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </View>
          </View>
        ) : (
          <View style={dynamicStyles.card}>
            <Text style={[dynamicStyles.cardTitle, getInterFontFeatures()]}>
              {historicalData.length === 0 && !chartDataFromPriceHistory ? 'Loading Chart Data...' : 'No Chart Data Available'}
            </Text>
            <Text style={[dynamicStyles.logEntryDate, { color: colors.textTertiary, marginTop: 8 }, getInterFontFeatures()]}>
              {historicalData.length === 0 && !chartDataFromPriceHistory ? 'Fetching prices...' : 'Add prices from the admin page to see the chart.'}
            </Text>
          </View>
        )}

        {/* Second Card: Price History */}
        <View style={dynamicStyles.card}>
          <Text style={[dynamicStyles.cardTitle, { marginTop: 20, marginBottom: 16 }, getInterFontFeatures()]}>
            Price History
          </Text>
          <View style={[dynamicStyles.divider, { backgroundColor: colors.divider }]} />
          {loadingHistory ? (
            <View style={dynamicStyles.logEntry}>
              <Text style={[dynamicStyles.logEntryDate, { color: colors.textTertiary }, getInterFontFeatures()]}>
                Loading...
              </Text>
            </View>
          ) : filteredPriceHistory.length > 0 ? (
            <View style={{ width: '100%' }}>
              {filteredPriceHistory.map((entry: any, index: number) => {
                const goldPerGram = entry.gold_999_base || 0;
                const silverPerGram = entry.silver_base || 0;
                const goldDisplay = (goldPerGram * 10).toLocaleString('en-IN');
                const silverDisplay = (silverPerGram * 1000).toLocaleString('en-IN');
                const date = new Date(entry.updated_at);
                
                const day = date.getDate().toString();
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames[date.getMonth()];
                const formattedDate = `${day} ${month} •`;
                
                const hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'pm' : 'am';
                const displayHours = (hours % 12 || 12).toString();
                const formattedTime = `${displayHours}.${minutes} ${ampm}`;

                return (
                  <View key={entry.id || `entry-${index}`} style={dynamicStyles.logEntry}>
                    <View style={dynamicStyles.logEntryHeader}>
                      <Text style={[dynamicStyles.logEntryDate, { color: 'rgba(0, 0, 0, 0.4)' }, getInterFontFeatures()]}>
                        {formattedDate} {formattedTime}
                      </Text>
                    </View>
                    <View style={dynamicStyles.logEntryPrices}>
                      <View style={dynamicStyles.logPriceRow}>
                        <Text style={[dynamicStyles.logPriceLabel, { color: 'rgba(0, 0, 0, 0.6)' }, getInterFontFeatures()]}>
                          Gold (1g)
                        </Text>
                        <Text style={[dynamicStyles.logPriceValue, { color: '#000000' }, getInterFontFeatures()]}>
                          ₹{goldPerGram.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={dynamicStyles.logPriceRow}>
                        <Text style={[dynamicStyles.logPriceLabel, { color: 'rgba(0, 0, 0, 0.6)' }, getInterFontFeatures()]}>
                          Silver (1kg)
                        </Text>
                        <Text style={[dynamicStyles.logPriceValue, { color: '#000000' }, getInterFontFeatures()]}>
                          ₹{silverDisplay}
                        </Text>
                      </View>
                    </View>
                    {index < filteredPriceHistory.length - 1 && (
                      <View style={[dynamicStyles.logDivider, { backgroundColor: 'rgba(0, 0, 0, 0.1)' }]} />
                    )}
                  </View>
                );
              })}
            </View>
          ) : priceHistory.length > 0 ? (
            <View style={dynamicStyles.logEntry}>
              <Text style={[dynamicStyles.logEntryDate, { color: 'red' }, getInterFontFeatures()]}>
                No valid price history entries found.
              </Text>
            </View>
          ) : (
            <View style={dynamicStyles.logEntry}>
              <Text style={[dynamicStyles.logEntryDate, { color: colors.textTertiary }, getInterFontFeatures()]}>
                No price history available
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    right: Platform.OS === 'web' ? 16 : 24, // More padding on mobile (24px) vs web (16px)
    zIndex: 1000,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      top: 20,
    }),
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 100 : Platform.OS === 'android' ? 80 : 60, // Add top padding for close button
    paddingBottom: Platform.OS === 'ios' ? 40 : Platform.OS === 'android' ? 20 : 20,
    ...(Platform.OS === 'web' && {
      paddingTop: 60, // Top padding for close button on web
      maxWidth: 450,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  tabUnderlineWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabUnderline: {
    width: 50,
    height: 4,
    backgroundColor: '#000000',
  },
  tabSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    width: '100%',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 16,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 450,
      alignSelf: 'center',
      minHeight: 100,
    }),
  },
  cardGraph: {
    paddingVertical: 24,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  cardPaddedSection: {
    paddingHorizontal: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: getFontFamily(500),
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chartHeaderPlaceholder: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  chartBigValue: {
    fontSize: 22,
    color: '#000',
    letterSpacing: -0.02,
    fontFamily: getFontFamily(500),
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  chartDeltaRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
    backgroundColor: 'transparent',
  },
  chartDateText: {
    fontSize: 12,
    fontFamily: getFontFamily(400),
    color: 'rgba(0,0,0,0.4)',
    marginTop: -4,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 400 }),
  },
  deltaText: {
    fontSize: 12,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    marginBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  rangeChipActive: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  rangeChipText: {
    fontSize: 12,
    fontFamily: getFontFamily(600),
    color: 'rgba(0,0,0,0.45)',
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  rangeChipTextActive: {
    color: '#000',
  },
  chartAreaPlaceholder: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  chartAreaPlaceholderBar: {
    width: '70%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  graphContainer: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 20,
    minHeight: 260,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  logEntry: {
    marginBottom: 16,
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
    }),
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  logEntryDate: {
    fontSize: 13,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
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
