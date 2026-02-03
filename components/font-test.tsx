import { Platform, Text, View, StyleSheet } from 'react-native';

/**
 * Component to test if Inter fonts are loading correctly
 * This helps debug font loading issues in Expo Go
 */
export function FontTest() {
  if (Platform.OS === 'web') {
    return null; // Don't show on web
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Font Test (should be Inter):</Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Regular' }]}>
        Inter-Regular (400)
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Medium' }]}>
        Inter-Medium (500)
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-SemiBold' }]}>
        Inter-SemiBold (600)
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Bold' }]}>
        Inter-Bold (700)
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-ExtraBold' }]}>
        Inter-ExtraBold (800)
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Black' }]}>
        Inter-Black (900)
      </Text>
      <Text style={[styles.test, { fontFamily: 'System' }]}>
        System Font (fallback)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  test: {
    fontSize: 18,
    marginVertical: 4,
  },
});
