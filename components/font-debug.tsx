import { Platform, Text, View, StyleSheet } from 'react-native';

/**
 * Debug component to test if Inter fonts are actually loading
 * This will help us verify fonts are working in Expo Go
 */
export function FontDebug() {
  // Always show on native for debugging (remove !__DEV__ check)
  if (Platform.OS === 'web') {
    return null; // Only show on native
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🔤 FONT DEBUG - Should see different weights if Inter is working:</Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Regular' }]}>
        Inter-Regular (400) - ABC abc 123
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Medium' }]}>
        Inter-Medium (500) - ABC abc 123
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-SemiBold' }]}>
        Inter-SemiBold (600) - ABC abc 123
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Bold' }]}>
        Inter-Bold (700) - ABC abc 123
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-ExtraBold' }]}>
        Inter-ExtraBold (800) - ABC abc 123
      </Text>
      <Text style={[styles.test, { fontFamily: 'Inter-Black' }]}>
        Inter-Black (900) - ABC abc 123
      </Text>
      <Text style={[styles.test, { fontFamily: 'System' }]}>
        System Font (fallback) - ABC abc 123
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFE5E5', // Light red background to make it very visible
    margin: 10,
    marginTop: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  test: {
    fontSize: 16,
    marginVertical: 3,
    color: '#000',
  },
});
