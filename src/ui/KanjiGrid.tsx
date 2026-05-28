// Responsive grid of SRS-colored kanji chips, shared by the grade and radical browse screens.
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { KanjiWithSrs, srsOf } from '@/data/types';
import { cardStateColors } from '@/ui/theme';

const CHIP = 60;
const GAP = 6;

export function KanjiGrid({
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
  /** Optional content rendered below the grid (still inside the scroll surface). */
  footer?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const available = width - GAP * 2; // content padding sits on both edges
  const numColumns = Math.max(1, Math.floor((available + GAP) / (CHIP + GAP)));
  const size = Math.floor((available - GAP * (numColumns - 1)) / numColumns);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      key={numColumns}
      data={kanji}
      keyExtractor={(item) => item.kanji.character}
      numColumns={numColumns}
      contentContainerStyle={{ padding: GAP }}
      columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      ListFooterComponent={footer ? <>{footer}</> : null}
      renderItem={({ item }) => (
        <KanjiChip
          card={item}
          size={size}
          suspended={suspended?.has(item.kanji.character) ?? false}
          onPress={() => onPress(item.kanji.character)}
          onLongPress={onLongPress ? () => onLongPress(item.kanji.character) : undefined}
        />
      )}
    />
  );
}

function KanjiChip({
  card,
  size,
  suspended,
  onPress,
  onLongPress,
}: {
  card: KanjiWithSrs;
  size: number;
  suspended: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const bg = cardStateColors[srsOf(card).type];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.chip, { width: size, height: size, backgroundColor: bg }, suspended && styles.suspended]}
    >
      <Text style={styles.chipGlyph}>{card.kanji.character}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  suspended: { opacity: 0.3 },
  chipGlyph: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
});
