import { WidgetPreview } from '@/components/widget-preview';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TabTwoScreen() {
  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [goldChangeDiff, setGoldChangeDiff] = useState(0);
  const [silverChangeDiff, setSilverChangeDiff] = useState(0);
  const [goldChangeDirection, setGoldChangeDirection] = useState<'up' | 'down' | null>(null);
  const [silverChangeDirection, setSilverChangeDirection] = useState<'up' | 'down' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        const { data: entries, error } = await supabase
          .from('market_prices')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(2);

        if (error || !entries || entries.length === 0) {
          setIsLoading(false);
          return;
        }

        const latestEntry = entries[0];
        const previousEntry = entries.length > 1 ? entries[1] : entries[0];

        // Format prices
        const goldPerGram = latestEntry.gold_999_base || 0;
        const silverPerGram = latestEntry.silver_base || 0;
        
        // Gold: 10g format (matching widget)
        const gold10g = Math.round(goldPerGram * 10);
        setGoldPrice(`₹${gold10g.toLocaleString('en-IN')}`);
        
        // Silver: 1kg format (matching widget)
        const silver1kg = Math.round(silverPerGram * 1000);
        setSilverPrice(`₹${silver1kg.toLocaleString('en-IN')}`);

        // Calculate changes
        const prevGoldPerGram = previousEntry.gold_999_base || goldPerGram;
        const prevSilverPerGram = previousEntry.silver_base || silverPerGram;

        const goldDiff = Math.abs(goldPerGram - prevGoldPerGram);
        const silverDiff = Math.abs((silverPerGram - prevSilverPerGram) * 1000);

        setGoldChangeDiff(goldDiff);
        setSilverChangeDiff(silverDiff);
        setGoldChangeDirection(goldPerGram > prevGoldPerGram ? 'up' : goldPerGram < prevGoldPerGram ? 'down' : null);
        setSilverChangeDirection(silverPerGram > prevSilverPerGram ? 'up' : silverPerGram < prevSilverPerGram ? 'down' : null);
        setIsLoading(false);
      } catch (e) {
        console.error('Error fetching prices for preview:', e);
        setIsLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>iOS Widget Preview</Text>
          <Text style={styles.subtitle}>
            This preview matches the iOS widget design. Iterate here before building in Xcode.
          </Text>
        </View>

        <View style={styles.widgetsSpacing}>
          <WidgetPreview
          goldPrice={goldPrice}
          silverPrice={silverPrice}
          goldChangeDiff={goldChangeDiff}
          silverChangeDiff={silverChangeDiff}
          goldChangeDirection={goldChangeDirection}
          silverChangeDirection={silverChangeDirection}
          isLoading={isLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 64, // More top padding to move content further down
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 16, // 16px padding on web
    }),
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
    maxWidth: 300,
  },
  widgetsSpacing: {
    marginTop: 48,
  },
});
