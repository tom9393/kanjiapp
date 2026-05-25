// The cards with the most lapses, each tappable through to its detail screen.
// Ported from StatsScreen.kt.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Divider, SectionNote, StatCard, shared } from '@/stats/primitives';
import { HardCard, StatsUiState } from '@/stats/statsModels';
import { usePalette } from '@/ui/theme';

export function HardestCardsSection({ state }: { state: StatsUiState }) {
  const router = useRouter();
  if (state.hardestCards.length === 0) return null;
  return (
    <StatCard title="Hardest Characters">
      <SectionNote text="Cards with the most lapses" />
      <View style={{ height: 8 }} />
      {state.hardestCards.map((card) => (
        <HardCardRow
          key={card.character}
          card={card}
          onPress={() => router.push({ pathname: '/kanji/[character]', params: { character: card.character } })}
        />
      ))}
    </StatCard>
  );
}

function HardCardRow({ card, onPress }: { card: HardCard; onPress: () => void }) {
  const p = usePalette();
  return (
    <View>
      <Pressable onPress={onPress} style={styles.hardRow}>
        <Text style={[styles.hardGlyph, { color: p.text }]}>{card.character}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14, color: p.text }}>{`${card.lapses} lapse${card.lapses !== 1 ? 's' : ''}`}</Text>
          <Text style={[shared.bodySmall, { color: p.textSecondary }]}>{`Ease: ${Math.floor(card.factor / 10)}%`}</Text>
        </View>
        <Text style={{ color: p.textSecondary, fontSize: 18 }}>›</Text>
      </Pressable>
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  hardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  hardGlyph: { fontSize: 28, width: 48, textAlign: 'center' },
});
