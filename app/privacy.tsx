import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getFontFamily = (weight: number = 400) => {
  if (Platform.OS === 'web') return "'Inter', sans-serif";
  const weightMap: { [key: number]: string } = {
    400: 'Inter-Regular',
    500: 'Inter-Medium',
    600: 'Inter-SemiBold',
    700: 'Inter-Bold',
  };
  return weightMap[weight] || 'Inter-Regular';
};

const LAST_UPDATED = '3 February 2026';
const CONTACT_EMAIL = 'rahulboggaram@gmail.com';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          {Platform.OS === 'web' ? (
            <Text style={styles.backText}>←</Text>
          ) : (
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>Spot – Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Text style={styles.paragraph}>
          Spot ("we") is a gold and silver price app. This policy describes how we handle information in the app and on the web.
        </Text>

        <Text style={styles.heading}>Data we use</Text>
        <Text style={styles.paragraph}>
          • The app fetches live gold and silver prices from our backend. No personal data is required to view prices.
        </Text>
        <Text style={styles.paragraph}>
          • We do not collect your name, email, or other personal data to show prices.
        </Text>
        <Text style={styles.paragraph}>
          • If you enable notifications, we use your device token only to send price alerts you choose. We do not use it for marketing.
        </Text>

        <Text style={styles.heading}>Data we don’t sell</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal data to third parties.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>
          For privacy questions or requests, contact: {CONTACT_EMAIL}.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  backText: {
    fontSize: 17,
    fontFamily: getFontFamily(500),
    color: '#FFFFFF',
    ...(Platform.OS === 'web' && { fontWeight: '500' as const }),
  },
  title: {
    fontSize: 18,
    fontFamily: getFontFamily(600),
    color: '#FFFFFF',
    ...(Platform.OS === 'web' && { fontWeight: '600' as const }),
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    ...(Platform.OS === 'web' && { maxWidth: 560, alignSelf: 'center', width: '100%' }),
  },
  appName: {
    fontSize: 20,
    fontFamily: getFontFamily(700),
    color: '#FFFFFF',
    marginBottom: 4,
    ...(Platform.OS === 'web' && { fontWeight: '700' as const }),
  },
  updated: {
    fontSize: 13,
    fontFamily: getFontFamily(400),
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
    ...(Platform.OS === 'web' && { fontWeight: '400' as const }),
  },
  heading: {
    fontSize: 16,
    fontFamily: getFontFamily(600),
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    ...(Platform.OS === 'web' && { fontWeight: '600' as const }),
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: getFontFamily(400),
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
    ...(Platform.OS === 'web' && { fontWeight: '400' as const }),
  },
});
