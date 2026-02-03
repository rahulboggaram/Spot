import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const SUPPORT_EMAIL = 'rahulboggaram@gmail.com';

export default function SupportScreen() {
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
        <Text style={styles.title}>Support & Contact</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>Spot – Gold & Silver Prices</Text>
        <Text style={styles.paragraph}>
          For support, feature requests, or feedback, please email us. We typically respond within 1–2 business days.
        </Text>
        <TouchableOpacity
          style={styles.emailLink}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
        <Text style={styles.paragraph}>
          Common topics: price data, widget not updating, app issues, or suggestions. We’re happy to help.
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
    marginBottom: 16,
    ...(Platform.OS === 'web' && { fontWeight: '700' as const }),
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: getFontFamily(400),
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
    ...(Platform.OS === 'web' && { fontWeight: '400' as const }),
  },
  emailLink: {
    marginBottom: 24,
  },
  email: {
    fontSize: 16,
    fontFamily: getFontFamily(600),
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    ...(Platform.OS === 'web' && { fontWeight: '600' as const }),
  },
});
