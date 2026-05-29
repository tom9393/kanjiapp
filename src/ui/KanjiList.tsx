// Stacked-list alternative to KanjiGrid: one row per kanji showing an SRS-colored glyph next to
// its meanings and on/kun readings. Shares KanjiGrid's prop signature so screens can swap freely.
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { KanjiWithSrs, srsOf } from '@/data/types';
import { cardStateColors, fontSize, radius, spacing, usePalette } from '@/ui/theme';

export function KanjiList({
  kanji,
  loading,
  onPress,
  onLongPress,
  suspended,
  footer,
}: {
  kanji: KanjiWithSrs[];
  loading: boolean;
  onPress: (character: string) => void;
  onLongPress?: (character: string) => void;
  /** Characters to dim as suspended (excluded from study). */
  suspended?: Set<string>;
  /** Optional content rendered below the list (still inside the scroll surface). */
  footer?: React.ReactNode;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={kanji}
      keyExtractor={(item) => item.kanji.character}
      contentContainerStyle={{ padding: spacing.sm }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListFooterComponent={footer ? <>{footer}</> : null}
      renderItem={({ item }) => (
        <KanjiRow
          card={item}
          suspended={suspended?.has(item.kanji.character) ?? false}
          onPress={() => onPress(item.kanji.character)}
          onLongPress={onLongPress ? () => onLongPress(item.kanji.character) : undefined}
        />
      )}
    />
  );
}

function KanjiRow({
  card,
  suspended,
  onPress,
  onLongPress,
}: {
  card: KanjiWithSrs;
  suspended: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const p = usePalette();
  const { kanji } = card;
  const readings = [kanji.on, kanji.kun].map((r) => r.trim()).filter(Boolean).join('    ');

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: p.border, backgroundColor: pressed ? p.surfaceVariant : p.card },
        suspended && styles.suspended,
      ]}
    >
      <View style={[styles.glyphBox, { backgroundColor: cardStateColors[srsOf(card).type] }]}>
        <Text style={styles.glyph}>{kanji.character}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.meanings, { color: p.text }]} numberOfLines={1}>
          {kanji.meanings}
        </Text>
        {readings !== '' && (
          <Text style={[styles.readings, { color: p.textSecondary }]} numberOfLines={1}>
            {readings}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  suspended: { opacity: 0.3 },
  glyphBox: { width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  body: { flex: 1 },
  meanings: { fontSize: fontSize.body, fontWeight: '600' },
  readings: { fontSize: fontSize.small, paddingTop: 2 },
});
