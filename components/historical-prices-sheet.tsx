import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
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

  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    cardBackground: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    textTertiary: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    divider: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    priceUp: '#4CAF50',
    priceDown: '#F44336',
  };

  // Format data for chart - show last 30 days
  const chartData = useMemo(() => {
    const last30Days = data.slice(-30).reverse();
    const labels = last30Days.map((item) => {
      const date = new Date(item.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    // Convert to per gram and include both AM (Opening) and PM (Closing)
    const goldAM = last30Days.map((item) => item.goldPriceAM / 10); // Gold Opening (per gram)
    const goldPM = last30Days.map((item) => item.goldPricePM / 10); // Gold Closing (per gram)
    const silverAM = last30Days.map((item) => item.silverPriceAM / 1000); // Silver Opening (per gram)
    const silverPM = last30Days.map((item) => item.silverPricePM / 1000); // Silver Closing (per gram)
    
    return {
      labels,
      goldAM,
      goldPM,
      silverAM,
      silverPM,
    };
  }, [data]);

  const dynamicStyles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={[dynamicStyles.headerTitle, { color: colors.text }]}>Price History</Text>
            <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={dynamicStyles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Chart - Simplified bar chart without SVG */}
            {data.length > 0 && chartData && (
              <View style={dynamicStyles.chartContainer}>
                <Text style={[dynamicStyles.chartTitle, { color: colors.text }]}>Price Trends (Last 30 Days)</Text>
                
                {/* Simple visualization - showing AM (Opening) and PM (Closing) */}
                <View style={dynamicStyles.simpleChartContainer}>
                  {chartData.labels.map((label, index) => {
                    // Calculate max values for scaling
                    const allGoldValues = [...chartData.goldAM, ...chartData.goldPM];
                    const allSilverValues = [...chartData.silverAM, ...chartData.silverPM];
                    const maxGold = Math.max(...allGoldValues);
                    const maxSilver = Math.max(...allSilverValues);
                    
                    // Calculate heights as percentages
                    const goldAMHeight = (chartData.goldAM[index] / maxGold) * 100;
                    const goldPMHeight = (chartData.goldPM[index] / maxGold) * 100;
                    const silverAMHeight = (chartData.silverAM[index] / maxSilver) * 100;
                    const silverPMHeight = (chartData.silverPM[index] / maxSilver) * 100;
                    
                    return (
                      <View key={index} style={dynamicStyles.chartBarContainer}>
                        <View style={dynamicStyles.chartBarWrapper}>
                          {/* Silver PM (Closing) - darker silver */}
                          <View 
                            style={[
                              dynamicStyles.chartBar, 
                              { 
                                height: `${silverPMHeight}%`,
                                backgroundColor: 'rgba(192, 192, 192, 0.6)',
                                borderWidth: 0.5,
                                borderColor: 'rgba(192, 192, 192, 0.8)',
                              }
                            ]} 
                          />
                          {/* Silver AM (Opening) - lighter silver */}
                          <View 
                            style={[
                              dynamicStyles.chartBar, 
                              { 
                                height: `${silverAMHeight}%`,
                                backgroundColor: 'rgba(192, 192, 192, 0.3)',
                                borderWidth: 0.5,
                                borderColor: 'rgba(192, 192, 192, 0.5)',
                              }
                            ]} 
                          />
                          {/* Gold PM (Closing) - darker gold */}
                          <View 
                            style={[
                              dynamicStyles.chartBar, 
                              { 
                                height: `${goldPMHeight}%`,
                                backgroundColor: 'rgba(255, 215, 0, 0.7)',
                                borderWidth: 0.5,
                                borderColor: 'rgba(255, 215, 0, 0.9)',
                              }
                            ]} 
                          />
                          {/* Gold AM (Opening) - lighter gold */}
                          <View 
                            style={[
                              dynamicStyles.chartBar, 
                              { 
                                height: `${goldAMHeight}%`,
                                backgroundColor: 'rgba(255, 215, 0, 0.4)',
                                borderWidth: 0.5,
                                borderColor: 'rgba(255, 215, 0, 0.6)',
                              }
                            ]} 
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
                
                <View style={dynamicStyles.legend}>
                  <View style={dynamicStyles.legendRow}>
                    <View style={dynamicStyles.legendItem}>
                      <View style={[dynamicStyles.legendDot, { backgroundColor: 'rgba(255, 215, 0, 0.4)' }]} />
                      <Text style={[dynamicStyles.legendText, { color: colors.textSecondary }]}>Gold Opening</Text>
                    </View>
                    <View style={dynamicStyles.legendItem}>
                      <View style={[dynamicStyles.legendDot, { backgroundColor: 'rgba(255, 215, 0, 0.7)' }]} />
                      <Text style={[dynamicStyles.legendText, { color: colors.textSecondary }]}>Gold Closing</Text>
                    </View>
                  </View>
                  <View style={dynamicStyles.legendRow}>
                    <View style={dynamicStyles.legendItem}>
                      <View style={[dynamicStyles.legendDot, { backgroundColor: 'rgba(192, 192, 192, 0.3)' }]} />
                      <Text style={[dynamicStyles.legendText, { color: colors.textSecondary }]}>Silver Opening</Text>
                    </View>
                    <View style={dynamicStyles.legendItem}>
                      <View style={[dynamicStyles.legendDot, { backgroundColor: 'rgba(192, 192, 192, 0.6)' }]} />
                      <Text style={[dynamicStyles.legendText, { color: colors.textSecondary }]}>Silver Closing</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Historical Data Table */}
            <View style={dynamicStyles.tableContainer}>
              <Text style={[dynamicStyles.tableTitle, { color: colors.text }]}>Last 30 Days</Text>
              <View style={[dynamicStyles.tableHeader, { borderBottomColor: colors.divider }]}>
                <Text style={[dynamicStyles.tableHeaderText, { color: colors.textTertiary }]}>Date</Text>
                <Text style={[dynamicStyles.tableHeaderText, { color: colors.textTertiary }]}>Gold (10g)</Text>
                <Text style={[dynamicStyles.tableHeaderText, { color: colors.textTertiary }]}>Silver (1kg)</Text>
              </View>
              
              {data.slice(-30).reverse().map((item, index) => {
                const date = new Date(item.date);
                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                return (
                  <View 
                    key={index} 
                    style={[
                      dynamicStyles.tableRow, 
                      { borderBottomColor: colors.divider }
                    ]}
                  >
                    <Text style={[dynamicStyles.tableCell, { color: colors.textSecondary, flex: 1.2 }]}>
                      {formattedDate}
                    </Text>
                    <View style={{ flex: 1.5 }}>
                      <Text style={[dynamicStyles.tableCellPrice, { color: colors.textTertiary }]}>
                        AM: ₹{item.goldPriceAM.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[dynamicStyles.tableCellPrice, { color: colors.textSecondary }]}>
                        PM: ₹{item.goldPricePM.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={[dynamicStyles.tableCellPrice, { color: colors.textTertiary }]}>
                        AM: ₹{item.silverPriceAM.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[dynamicStyles.tableCellPrice, { color: colors.textSecondary }]}>
                        PM: ₹{item.silverPricePM.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                );
              })}
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  chartContainer: {
    padding: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
    marginBottom: 20,
  },
  simpleChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    width: '100%',
    marginBottom: 16,
  },
  chartBarContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 1,
  },
  chartBarWrapper: {
    width: '100%',
    height: '100%',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
    gap: 2,
  },
  chartBar: {
    width: '100%',
    minHeight: 2,
    borderRadius: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  simpleChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    width: '100%',
    marginBottom: 16,
  },
  chartBarContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 1,
  },
  chartBarWrapper: {
    width: '100%',
    height: '100%',
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
    gap: 2,
  },
  chartBar: {
    width: '100%',
    minHeight: 2,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Fonts.grotesk,
  },
  tableContainer: {
    padding: 24,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
    textTransform: 'uppercase',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Fonts.grotesk,
  },
  tableCellPrice: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: Fonts.grotesk,
    lineHeight: 16,
  },
});
