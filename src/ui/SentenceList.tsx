// The collapsible "Sentences" card shared by the kanji and word detail screens: each row shows
// the Japanese + English and opens that sentence; rows past the limit hide behind "Show more".
import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ExampleSentence } from '@/data/types';
import { ShowMore } from '@/ui/ShowMore';
import { usePalette } from '@/ui/theme';

const COLLAPSE_LIMIT = 5;

export function SentenceList({
  sentences,
  onOpen,
  style,
}: {
  sentences: ExampleSentence[];
  onOpen: (id: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const [expanded, setExpanded] = useState(false);
  if (sentences.length === 0) return null;

  const shown = expanded ? sentences : sentences.slice(0, COLLAPSE_LIMIT);
  return (
    <View style={[styles.card, style, { backgroundColor: p.surfaceVariant }]}>
      <Text style={[styles.sectionTitle, { color: p.text }]}>Sentences</Text>
      {shown.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => onOpen(s.id)}
          style={({ pressed }) => [styles.sentenceRow, pressed && { opacity: 0.6 }]}
        >
          <View style={styles.sentenceText}>
            <Text style={[styles.sentenceJp, { color: p.text }]}>{s.japanese}</Text>
            <Text style={{ color: p.textSecondary }}>{s.english}</Text>
          </View>
          <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
        </Pressable>
      ))}
      {sentences.length > COLLAPSE_LIMIT && (
        <ShowMore
          expanded={expanded}
          hiddenCount={sentences.length - COLLAPSE_LIMIT}
          onToggle={() => setExpanded((v) => !v)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sentenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  sentenceText: { flex: 1 },
  sentenceJp: { fontSize: 16, lineHeight: 24 },
  chevron: { fontSize: 22 },
});
