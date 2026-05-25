// The labelled prompt header above a study card. Ported from study/view.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/ui/theme';

export function PromptHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.prompt}>
      <Text style={[styles.promptLabel, { color: p.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { padding: 16 },
  promptLabel: { fontSize: 13, marginBottom: 8 },
});
