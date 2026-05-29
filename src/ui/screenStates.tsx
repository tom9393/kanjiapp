// The full-screen loading spinner and "not found" message shared by the detail screens.
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
      <Text style={{ color: p.text }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
