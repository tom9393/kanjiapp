// Example sentence (Japanese + English) card. Ported from the study/view/* composables.
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ExampleSentence } from '@/data/types';
import { usePalette } from '@/ui/theme';

export function SentenceCard({ sentence, style }: { sentence: ExampleSentence; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View style={[styles.sentenceCard, { backgroundColor: p.surfaceVariant }, style]}>
      <Text style={[styles.sentenceJp, { color: p.text }]}>{sentence.japanese}</Text>
      <Text style={[styles.sentenceEn, { color: p.textSecondary }]}>{sentence.english}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sentenceCard: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  sentenceJp: { fontSize: 16, marginBottom: 4 },
  sentenceEn: { fontSize: 13 },
});
