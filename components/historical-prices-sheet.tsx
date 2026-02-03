import { SimpleLineChart } from '@/components/simple-line-chart';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { getInterFontFeatures } from '@/utils/font-features';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

// Helper function to get the correct font family based on platform and weight
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

interface HistoricalPrice {
  date: string;
  goldPriceAM: number; // 10 grams rate (AM/Opening)
  goldPricePM: number; // 10 grams rate (PM/Closing)
  silverPriceAM: number; // 1kg rate (AM/Opening)
  silverPricePM: number; // 1kg rate (PM/Closing)
}

interface HistoricalPricesSheetProps {
  visible: boolean;
  onClose: () => void;
  data: HistoricalPrice[];
}

export function HistoricalPricesSheet({ visible, onClose, data }: HistoricalPricesSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'gold' | 'silver'>('gold');
  const [range, setRange] = useState<'7D' | '15D' | '30D' | '1Y'>('7D');
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState<number>(0); // Offset for dragging to past

  // Filter valid price history entries
  const filteredPriceHistory = useMemo(() => {
    if (priceHistory.length === 0) {
      return [];
    }
    
    if (Platform.OS === 'web') {
      console.log('📊 [WEB] Filtering', priceHistory.length, 'entries');
      console.log('📊 [WEB] Sample entry:', priceHistory[0]);
    }
    
    const filtered = priceHistory.filter((entry: any) => {
      if (!entry) {
        if (Platform.OS === 'web') {
          console.warn('⚠️ [WEB] Entry is null/undefined');
        }
        return false;
      }
      if (!entry.id) {
        if (Platform.OS === 'web') {
          console.warn('⚠️ [WEB] Entry missing id:', entry);
        }
        return false;
      }
      if (!entry.updated_at) {
        if (Platform.OS === 'web') {
          console.warn('⚠️ [WEB] Entry missing updated_at:', entry);
        }
        return false;
      }
      const date = new Date(entry.updated_at);
      if (isNaN(date.getTime())) {
        if (Platform.OS === 'web') {
          console.warn('⚠️ [WEB] Entry has invalid date:', entry.updated_at, entry);
        }
        return false;
      }
      return true;
    });
    
    if (Platform.OS === 'web') {
      console.log('📊 [WEB] Filtered entries count:', filtered.length, 'out of', priceHistory.length);
      if (filtered.length === 0 && priceHistory.length > 0) {
        console.error('❌ [WEB] All entries filtered out! First entry:', priceHistory[0]);
      }
    }
    
    return filtered;
  }, [priceHistory]);

  const colors = {
    background: '#F0F0F0',
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

  // Fetch price history from market_prices table (like admin)
  useEffect(() => {
    if (visible) {
      const loadPriceHistory = async () => {
        setLoadingHistory(true);
        try {
          if (Platform.OS === 'web') {
            console.log('📊 [WEB] Loading price history...');
          } else {
            console.log('📊 Loading price history...');
          }
          
          // Try without date filter first to see if we get any data
          const { data: historyData, error } = await supabase
            .from('market_prices')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(100);
          
          if (Platform.OS === 'web') {
            console.log('📊 [WEB] Price history query result:', {
              dataLength: historyData?.length || 0,
              error: error?.message || null,
              firstEntry: historyData?.[0] || null,
              allData: historyData
            });
          } else {
            console.log('📊 Price history query result:', {
              dataLength: historyData?.length || 0,
              error: error?.message || null,
              firstEntry: historyData?.[0] || null
            });
          }
          
          if (error) {
            console.error('❌ Error loading price history:', error);
            if (Platform.OS === 'web') {
              console.error('❌ [WEB] Full error:', JSON.stringify(error, null, 2));
            }
            setPriceHistory([]);
            setLoadingHistory(false);
            return;
          }
          
          if (historyData && historyData.length > 0) {
            // Filter out any invalid entries before setting state
            const validData = historyData.filter((entry: any) => 
              entry && 
              entry.id && 
              entry.updated_at &&
              (entry.gold_999_base !== undefined || entry.silver_base !== undefined)
            );
            
            if (Platform.OS === 'web') {
              console.log('✅ [WEB] Price history loaded:', validData.length, 'valid entries out of', historyData.length, 'total');
              console.log('📊 [WEB] Sample entry:', JSON.stringify(validData[0], null, 2));
            } else {
              console.log('✅ Price history loaded:', validData.length, 'entries');
              console.log('📊 Sample entry:', JSON.stringify(validData[0], null, 2));
            }
            
            setPriceHistory(validData);
          } else {
            if (Platform.OS === 'web') {
              console.log('⚠️ [WEB] No price history data found');
            } else {
              console.log('⚠️ No price history data found');
            }
            setPriceHistory([]);
          }
        } catch (error) {
          console.error('❌ Error loading price history:', error);
          if (Platform.OS === 'web') {
            console.error('❌ [WEB] Full error:', error);
          }
          setPriceHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      };
      
      loadPriceHistory();
    } else {
      // Clear price history when sheet is closed
      setPriceHistory([]);
      setLoadingHistory(false);
    }
  }, [visible]);

  const rangeDays = useMemo(() => {
    switch (range) {
      case '7D':
        return 7;
      case '15D':
        return 15;
      case '30D':
        return 30;
      case '1Y':
        return 365;
      default:
        return 15;
    }
  }, [range]);

  // Convert priceHistory (market_prices table) to chart format
  // This is the primary data source with 66+ entries
  // Group by day and keep only the most recent entry per day
  const chartDataFromPriceHistory = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return null;
    }
    
    // First, convert and filter valid entries
    const converted = priceHistory
      .filter((item: any) => item && item.updated_at && (item.gold_999_base !== undefined || item.silver_base !== undefined))
      .map((item: any) => {
        const dateStr = item.updated_at ? item.updated_at.split('T')[0] : '';
        return {
          date: dateStr,
          updated_at: item.updated_at, // Keep original timestamp for sorting
          goldPriceAM: (item.gold_999_base || 0) * 10, // Convert per gram to 10g
          goldPricePM: (item.gold_999_base || 0) * 10,
          silverPriceAM: (item.silver_base || 0) * 1000, // Convert per gram to 1kg
          silverPricePM: (item.silver_base || 0) * 1000,
        };
      });
    
    if (converted.length === 0) {
      return null;
    }
    
    // Group by date and keep only the most recent entry per day
    const groupedByDate = new Map<string, any>();
    
    converted.forEach((item: any) => {
      const dateKey = item.date;
      if (!dateKey) return;
      
      const existing = groupedByDate.get(dateKey);
      if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
        // Keep this entry if it's newer than the existing one for this date
        groupedByDate.set(dateKey, item);
      }
    });
    
    // Convert map to array and sort by date (newest first)
    const uniqueDays = Array.from(groupedByDate.values()).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending (newest first)
    });
    
    if (Platform.OS === 'web' && __DEV__) {
      console.log('📊 [GRAPH] Grouped by unique days:', {
        totalEntries: converted.length,
        uniqueDays: uniqueDays.length,
        first10Dates: uniqueDays.slice(0, 10).map((item: any) => item.date),
        last10Dates: uniqueDays.slice(-10).map((item: any) => item.date),
        mostRecentDate: uniqueDays[0]?.date,
        oldestDate: uniqueDays[uniqueDays.length - 1]?.date
      });
    }
    
    return uniqueDays.length > 0 ? uniqueDays : null;
  }, [priceHistory]);

  // Format data for chart (filtered by range, ascending for left->right)
  // Use priceHistory data (market_prices) as primary source, fallback to data prop
  const chartData = useMemo(() => {
    // Prefer priceHistory data from market_prices table (has 66+ entries)
    const dataToUse = chartDataFromPriceHistory || (data && data.length > 0 ? data : null);
    
    if (!dataToUse || dataToUse.length === 0) {
      return null;
    }
    
    // First, filter out invalid entries and sort by date
    const validData = dataToUse.filter((item) => {
      if (!item.date) return false;
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime());
    });
    
    if (validData.length === 0) {
      return null;
    }
    
    // Sort all data by date (newest first) to get the most recent entries
    const sortedAll = [...validData].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending (newest first) - most recent at index 0
    });
    
    // Simply take the most recent N entries based on rangeDays
    // For 7D: take the most recent 7 entries (indices 0-6)
    // For 15D: take the most recent 15 entries, etc.
    const entriesToTake = Math.min(rangeDays, sortedAll.length);
    const filtered = sortedAll.slice(0, entriesToTake);
    
    if (Platform.OS === 'web' && __DEV__) {
      console.log('📊 [GRAPH] Using data source:', chartDataFromPriceHistory ? 'market_prices (priceHistory)' : 'data prop');
      console.log('📊 [GRAPH] Entry filtering:', {
        requestedEntries: rangeDays,
        totalAvailable: sortedAll.length,
        usingEntries: filtered.length,
        mostRecentDate: filtered[0] ? new Date(filtered[0].date).toISOString().split('T')[0] : 'N/A',
        oldestDate: filtered[filtered.length - 1] ? new Date(filtered[filtered.length - 1].date).toISOString().split('T')[0] : 'N/A',
        allFilteredDates: filtered.map((item: any) => {
          const d = new Date(item.date);
          return d.toISOString().split('T')[0];
        }),
        first5SortedAll: sortedAll.slice(0, 5).map((item: any) => {
          const d = new Date(item.date);
          return d.toISOString().split('T')[0];
        })
      });
    }

    // If the dataset is smaller than the selected range, just use what's available
    if (filtered.length === 0) {
      return null;
    }

    // Convert to ascending for chart rendering (oldest to newest, left to right)
    const series = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const labels = series.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    
    if (activeTab === 'gold') {
      // Gold: Convert 10g to per gram and calculate percentage growth
      const prices = series.map((item) => item.goldPricePM / 10); // Use PM closing prices
      const firstPrice = prices[0];
      // Calculate percentage change from first price (baseline = 0%)
      const percentageChanges = prices.map((price) => 
        firstPrice !== 0 ? ((price - firstPrice) / firstPrice) * 100 : 0
      );
      return { labels, prices: percentageChanges, color: 'rgba(0, 0, 0, 0.85)', label: 'Gold (per gram)', raw: series, actualPrices: prices, dates: series.map((item) => item.date) };
    } else {
      // Silver: Always ensure per kilo (1kg) format
      // Check which data source is actually being used
      const isUsingPriceHistory = dataToUse === chartDataFromPriceHistory;
      
      const prices = series.map((item) => {
        let silverPM = item.silverPricePM || 0;
        
        if (Platform.OS === 'web' && __DEV__) {
          console.log('🔍 [SILVER] Processing silver price:', {
            silverPM,
            isUsingPriceHistory,
            dataSource: isUsingPriceHistory ? 'market_prices (priceHistory)' : 'data prop',
            itemDate: item.date
          });
        }
        
        // If using priceHistory data from market_prices, it's already converted to per kilo in chartDataFromPriceHistory
        if (isUsingPriceHistory) {
          // Already in per kilo (was multiplied by 1000 in chartDataFromPriceHistory)
          return silverPM;
        } else {
          // Data prop fallback: check if conversion needed
          // If value is less than 1000, it's likely per gram and needs conversion
          // If value is >= 1000, it's likely already per kilo
          if (silverPM > 0 && silverPM < 1000) {
            if (Platform.OS === 'web' && __DEV__) {
              console.log('🔄 [SILVER] Converting per gram to per kilo:', silverPM, '→', silverPM * 1000);
            }
            return silverPM * 1000;
          }
          // If already >= 1000, assume it's per kilo (from historical_prices table or static data)
          return silverPM;
        }
      });
      
      if (Platform.OS === 'web' && __DEV__) {
        console.log('📊 [SILVER] Final prices array (per kilo):', {
          first3: prices.slice(0, 3),
          last3: prices.slice(-3),
          allPrices: prices
        });
      }
      
      const firstPrice = prices[0];
      // Calculate percentage change from first price (baseline = 0%)
      const percentageChanges = prices.map((price) => 
        firstPrice !== 0 ? ((price - firstPrice) / firstPrice) * 100 : 0
      );
      return { labels, prices: percentageChanges, color: 'rgba(0, 0, 0, 0.65)', label: 'Silver (per kilo)', raw: series, actualPrices: prices, dates: series.map((item) => item.date) };
    }
  }, [chartDataFromPriceHistory, data, activeTab, rangeDays]);

  // Auto-select the most recent entry (last index) when chart data changes or range changes
  useEffect(() => {
    if (chartData && chartData.actualPrices && chartData.actualPrices.length > 0) {
      // Select the last index (most recent entry) - this is the rightmost point on the chart
      const lastIndex = chartData.actualPrices.length - 1;
      setSelectedPointIndex(lastIndex);
      
      if (Platform.OS === 'web' && __DEV__) {
        console.log('📊 [GRAPH] Auto-selecting most recent entry:', {
          index: lastIndex,
          date: chartData.dates?.[lastIndex],
          price: chartData.actualPrices[lastIndex],
          totalEntries: chartData.actualPrices.length
        });
      }
    }
  }, [chartData, range]);

  // Get data for table - most recent first
  const tableData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    
    // Sort by date descending (most recent first), then take first 30
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    return sortedData.slice(0, 30).map((item) => {
      const date = new Date(item.date);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (activeTab === 'gold') {
        return {
          date: formattedDate,
          am: item.goldPriceAM,
          pm: item.goldPricePM,
          unit: '10g',
        };
      } else {
        return {
          date: formattedDate,
          am: item.silverPriceAM,
          pm: item.silverPricePM,
          unit: '1kg',
        };
      }
    });
  }, [data, activeTab]);

  const dynamicStyles = createStyles(colors);
  // Use selected point data if available, otherwise use current/last value
  const selectedValue = selectedPointIndex !== null && chartData?.actualPrices ? chartData.actualPrices[selectedPointIndex] : null;
  const selectedPercentage = selectedPointIndex !== null && chartData?.prices ? chartData.prices[selectedPointIndex] : null;
  
  const currentValue = selectedValue !== null ? selectedValue : (chartData?.actualPrices?.length ? chartData.actualPrices[chartData.actualPrices.length - 1] : null);
  const currentValueIndex = selectedPointIndex !== null ? selectedPointIndex : (chartData?.actualPrices?.length ? chartData.actualPrices.length - 1 : null);
  
  // Always show date for the value being displayed
  // If no point is selected, show today's date; otherwise show the selected point's date
  const displayDate = selectedPointIndex !== null && chartData?.dates ? (() => {
    const date = new Date(chartData.dates[selectedPointIndex]);
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  })() : (() => {
    // Show today's date when no point is selected
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={dynamicStyles.modalOverlay}>
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Close button outside card, centered above */}
        <TouchableOpacity 
          onPress={onClose} 
          style={dynamicStyles.closeButtonOutside}
          activeOpacity={0.7}
        >
          {Platform.OS === 'web' ? (
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '300', lineHeight: 24 }}>×</Text>
          ) : (
            <Ionicons name="close" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
        <View style={dynamicStyles.modalContent}>
          <ScrollView 
            style={dynamicStyles.scrollView}
            contentContainerStyle={dynamicStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={true}
          >
            {/* First Card: Graph Card with Tabs */}
            {data && data.length > 0 && chartData && (
              <View style={dynamicStyles.card}>
                {/* Tab Selector - Only in Graph Card */}
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
                    {activeTab === 'gold' && <View style={dynamicStyles.tabUnderline} />}
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
                    {activeTab === 'silver' && <View style={dynamicStyles.tabUnderline} />}
                  </TouchableOpacity>
                </View>
                {/* Separator at bottom of tabs */}
                <View style={dynamicStyles.tabSeparator} />
                
                <View style={dynamicStyles.chartHeaderRow}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {chartData && currentValue !== null && (
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
                    )}
                  </View>
                </View>

                {/* Chart */}
                <View style={dynamicStyles.graphContainer}>
                  <SimpleLineChart
                    data={chartData.prices}
                    labels={chartData.labels}
                    color={chartData.color}
                    width={Platform.OS === 'web' ? Math.min(400, Math.max(300, screenWidth - 112)) : (screenWidth - 112)}
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
                    onPointSelect={(index) => {
                      setSelectedPointIndex(index);
                    }}
                  />
                </View>
                {/* Range selector - below graph */}
                <View style={dynamicStyles.rangeRow}>
                  {(['7D', '15D', '30D', '1Y'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => {
                      setRange(r);
                      setSelectedPointIndex(null);
                      setScrollOffset(0); // Reset scroll when range changes
                    }}
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
            )}

            {/* Second Card: Price History (matching admin style) */}
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
                    // Debug log for each entry
                    if (Platform.OS === 'web') {
                      console.log('📊 [WEB] Processing entry:', entry);
                    }
                    
                    const goldPerGram = entry.gold_999_base || 0;
                    const silverPerGram = entry.silver_base || 0;
                    const goldDisplay = (goldPerGram * 10).toLocaleString('en-IN');
                    const silverDisplay = (silverPerGram * 1000).toLocaleString('en-IN');
                    const date = new Date(entry.updated_at);
                    
                    if (Platform.OS === 'web') {
                      console.log('📊 [WEB] Entry details:', {
                        id: entry.id,
                        goldPerGram,
                        silverPerGram,
                        goldDisplay,
                        silverDisplay,
                        updated_at: entry.updated_at,
                        dateValid: !isNaN(date.getTime())
                      });
                    }
                    
                    // Format date: "23 Jan •"
                    const day = date.getDate().toString();
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames[date.getMonth()];
                    const formattedDate = `${day} ${month} •`;
                    
                    // Format time: "9.14 pm" (period instead of colon, no leading zero)
                    const hours = date.getHours();
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'pm' : 'am';
                    const displayHours = (hours % 12 || 12).toString();
                    const formattedTime = `${displayHours}.${minutes} ${ampm}`;

                    if (Platform.OS === 'web') {
                      console.log('✅ [WEB] Rendering entry:', {
                        id: entry.id,
                        formattedDate,
                        formattedTime,
                        goldDisplay,
                        silverDisplay
                      });
                    }

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
                    {Platform.OS === 'web' ? `Filtered out all ${priceHistory.length} entries. Check console for details.` : 'No valid price history entries found.'}
                  </Text>
                  {Platform.OS === 'web' && __DEV__ && (
                    <Text style={{ fontSize: 10, color: 'red', marginTop: 8 }}>
                      First entry keys: {Object.keys(priceHistory[0] || {}).join(', ')}
                    </Text>
                  )}
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
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: Platform.OS === 'web' ? '90%' : '90%',
    width: '100%',
    flex: 1,
    ...(Platform.OS !== 'web' && {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    }),
    ...(Platform.OS === 'web' && {
      width: '100%',
      paddingHorizontal: 16, // 16px padding on web
      maxWidth: 432, // 400px card + 16px padding on each side
      alignSelf: 'center',
      position: 'relative',
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: getFontFamily(600),
    color: '#000',
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  closeButton: {
    padding: 4,
  },
  closeButtonOutside: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : Platform.OS === 'android' ? 20 : 20,
    alignSelf: 'center',
    zIndex: 1000,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    ...(Platform.OS === 'web' && {
      top: 20,
    }),
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      minHeight: 200,
      maxHeight: '100%',
    }),
  },
  scrollContent: {
    paddingHorizontal: 16, // 16px padding on all platforms
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 40, // Add top padding for status bar/dynamic island
    paddingBottom: Platform.OS === 'ios' ? 40 : Platform.OS === 'android' ? 20 : 20, // Add bottom padding for home indicator
    ...(Platform.OS === 'web' && {
      minHeight: 'auto',
      paddingHorizontal: 0, // Padding comes from modalContent on web
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
  tabActive: {
    // Active state handled by text color
  },
  tabText: {
    fontSize: 15,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '35%', // Center the bar: (100% - 30%) / 2 = 35% from left
    width: '30%', // 0.3x the current size (30% of tab width)
    height: 4, // 2x the thickness (2px -> 4px)
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
      maxWidth: 400,
      alignSelf: 'center',
      minHeight: 100,
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: getFontFamily(500),
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: getFontFamily(600),
    color: '#000',
    marginBottom: 20,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chartBigValue: {
    fontSize: 22,
    color: '#000',
    letterSpacing: -0.02,
    fontFamily: getFontFamily(500),
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  chartUnitText: {
    fontSize: 14,
    fontFamily: getFontFamily(500),
    color: 'rgba(0,0,0,0.35)',
    marginLeft: 6,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  chartDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
    marginTop: -4, // Moved 4px up (removed margin and moved up)
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 400 }),
  },
  deltaText: {
    fontSize: 12,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  deltaRangeText: {
    fontSize: 12,
    fontFamily: getFontFamily(600),
    color: 'rgba(0,0,0,0.35)',
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
  graphContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 13,
    fontFamily: getFontFamily(500),
    color: 'rgba(0,0,0,0.4)',
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 500 }),
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 15,
    fontFamily: getFontFamily(600),
    color: 'rgba(0,0,0,0.5)',
    flex: 1,
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
  },
  tableCellPrice: {
    fontSize: 15,
    letterSpacing: -0.02,
    fontFamily: getFontFamily(700),
    lineHeight: 20,
    ...(Platform.OS === 'web' && { fontWeight: 700 }),
  },
  // Price History Styles (matching admin)
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
  logEntryNumber: {
    fontSize: 13,
    fontFamily: getFontFamily(600),
    letterSpacing: -0.02,
    ...(Platform.OS === 'web' && { fontWeight: 600 }),
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
