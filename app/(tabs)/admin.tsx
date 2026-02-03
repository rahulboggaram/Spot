import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabase';

export default function AdminScreen() {
  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Dynamic colors that invert based on mode - matching index.tsx
  const colors = {
    background: isDark ? '#000000' : '#FFFFFF',
    cardBackground: isDark ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    cardBackgroundLight: isDark ? 'rgba(18, 18, 18, 0.6)' : 'rgba(255, 255, 255, 0.6)',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    textTertiary: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    borderLight: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderSubtle: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    borderVerySubtle: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    glassOverlay: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    inputBackground: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    buttonBackground: isDark ? '#FFFFFF' : '#000000',
    buttonText: isDark ? '#000000' : '#FFFFFF',
    buttonDisabled: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    divider: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  // Load current prices so you can see what is already live
  useEffect(() => {
    const loadCurrentPrices = async () => {
      const { data, error } = await supabase.from('market_prices').select('*').single();
      if (data) {
        // Convert from per gram to display units:
        // Gold: per gram * 10 = 10 grams rate
        // Silver: per gram * 1000 = 1kg rate
        setGoldPrice((data.gold_999_base * 10).toString());
        setSilverPrice((data.silver_base * 1000).toString());
      }
      setFetching(false);
    };
    loadCurrentPrices();
  }, []);

  const handleUpdate = async () => {
    if (!goldPrice || !silverPrice) {
      Alert.alert("Missing Data", "Please enter prices for both metals.");
      return;
    }

    setLoading(true);
    try {
      // Convert from input units to per gram for database storage:
      // Gold: 10 grams rate / 10 = per gram
      // Silver: 1kg rate / 1000 = per gram
      const { error } = await supabase
        .from('market_prices')
        .update({ 
          gold_999_base: parseFloat(goldPrice) / 10,
          silver_base: parseFloat(silverPrice) / 1000,
          updated_at: new Date() 
        })
        .eq('id', 1); // Assuming your first row is ID 1

      if (error) throw error;
      Alert.alert("Success", "Live rates updated!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = createStyles(colors);

  if (fetching) {
    return (
      <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator color={colors.text} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* TOP NAVIGATION BAR - matching index.tsx */}
      <View style={dynamicStyles.navBarWrapper}>
        <View style={dynamicStyles.navBar}>
          <Text style={[dynamicStyles.navTitle, { color: colors.text }]}>spot admin</Text>
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
            {/* ADMIN CARD - matching index.tsx glassmorphism style */}
            <View style={[
              dynamicStyles.largeCard,
              { backgroundColor: colors.cardBackground, borderColor: colors.border }
            ]}>
              {/* Glassmorphism background overlay */}
              <View style={[dynamicStyles.glassOverlay, { backgroundColor: colors.glassOverlay }]} />
              
              <View style={dynamicStyles.inputGroup}>
                <Text style={[dynamicStyles.label, { color: colors.textSecondary }]}>Gold 24K (10 grams rate)</Text>
                <TextInput 
                  style={[
                    dynamicStyles.input,
                    { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.inputBorder,
                    }
                  ]}
                  keyboardType="numeric"
                  value={goldPrice}
                  onChangeText={setGoldPrice}
                  placeholder="e.g. 74500"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={dynamicStyles.inputGroup}>
                <Text style={[dynamicStyles.label, { color: colors.textSecondary }]}>Silver (1kg rate)</Text>
                <TextInput 
                  style={[
                    dynamicStyles.input,
                    { 
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                      borderColor: colors.inputBorder,
                    }
                  ]}
                  keyboardType="numeric"
                  value={silverPrice}
                  onChangeText={setSilverPrice}
                  placeholder="e.g. 92000"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <TouchableOpacity 
                style={[
                  dynamicStyles.button,
                  { backgroundColor: colors.buttonBackground },
                  loading && { backgroundColor: colors.buttonDisabled, opacity: 0.5 }
                ]} 
                onPress={handleUpdate}
                disabled={loading}
              >
                <Text style={[dynamicStyles.buttonText, { color: colors.buttonText }]}>
                  {loading ? "Updating..." : "Update Live Prices"}
                </Text>
              </TouchableOpacity>
              
              <Text style={[dynamicStyles.hint, { color: colors.textTertiary }]}>
                Note: This changes the prices for ALL users immediately.
              </Text>
            </View>
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
    ...(Platform.OS === 'web' && {
      maxWidth: 480,
      width: '100%',
    }),
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 480,
      width: '100%',
    }),
  },
  navBar: {
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 480,
    }),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingTop: 24,
  },
  navTitle: {
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'web' ? "'Google Sans Flex', sans-serif" : 'Google Sans Flex',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  scrollContainer: {
    padding: 32,
    paddingBottom: 32,
  },
  
  // Large Card with Glassmorphism - matching index.tsx
  largeCard: {
    padding: 40,
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
    textAlign: 'center',
    marginBottom: 32,
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Fonts.grotesk,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  input: {
    padding: 18,
    borderRadius: 12,
    fontSize: 20,
    borderWidth: 1,
    fontFamily: Fonts.grotesk,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    fontFamily: Fonts.grotesk,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    letterSpacing: 0,
    fontFamily: Fonts.grotesk,
  },
});