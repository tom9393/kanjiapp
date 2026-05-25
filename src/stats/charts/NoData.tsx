// Placeholder shown by a chart when it has nothing to plot.
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/ui/theme';

export function NoData() {
  const p = usePalette();
  return (
    <View style={styles.noData}>
      <Text style={{ color: p.textSecondary, fontSize: 15 }}>No data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noData: { height: 80, alignItems: 'center', justifyContent: 'center' },
});
