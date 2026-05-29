// The full-screen loading spinner and "not found" message shared by the detail screens.
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/ui/theme';

export function Loading() {
  const p = usePalette();
  return (
    <View style={[styles.center, { backgroundColor: p.background }]}>
      <ActivityIndicator />
    </View>
  );
}

export function NotFound({ label }: { label: string }) {
  const p = usePalette();
  return (
    <View style={[styles.center, { backgroundColor: p.background }]}>
      <Ionicons name="search-outline" size={48} color={p.textSecondary} style={styles.icon} />
      <Text style={{ color: p.text }}>{label}</Text>
    </View>
  );
}

export function LoadError({ label = "Couldn't load this. Please try again." }: { label?: string }) {
  const p = usePalette();
  return (
    <View style={[styles.center, { backgroundColor: p.background }]}>
      <Ionicons name="alert-circle-outline" size={48} color={p.danger} style={styles.icon} />
      <Text style={{ color: p.text }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { marginBottom: 12, opacity: 0.6 },
});
