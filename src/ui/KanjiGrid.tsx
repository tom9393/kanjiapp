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
}: {
  kanji: KanjiWithSrs[];
  loading: boolean;
  onPress: (character: string) => void;
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
      renderItem={({ item }) => <KanjiChip card={item} size={size} onPress={() => onPress(item.kanji.character)} />}
    />
  );
}

function KanjiChip({ card, size, onPress }: { card: KanjiWithSrs; size: number; onPress: () => void }) {
  const bg = cardStateColors[srsOf(card).type];
  return (
    <Pressable onPress={onPress} style={[styles.chip, { width: size, height: size, backgroundColor: bg }]}>
      <Text style={styles.chipGlyph}>{card.kanji.character}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chipGlyph: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
});
