// Favorites: the kanji the user has starred (from the kanji detail screen), shown as a grid.
// Reloads on focus so a star toggled elsewhere is reflected when returning here.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getFavoriteKanji } from '@/data/repository/flags';
import { frequencyRank, KanjiWithSrs } from '@/data/types';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { usePalette } from '@/ui/theme';

export default function Favorites() {
  const router = useRouter();
  const p = usePalette();
  const [kanji, setKanji] = useState<KanjiWithSrs[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getFavoriteKanji().then((k) => {
        if (!active) return;
        k.sort((a, b) => frequencyRank(a.kanji) - frequencyRank(b.kanji)); // most common first
        setKanji(k);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });

  if (!loading && kanji.length === 0) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: p.background }]}>
        <Text style={[styles.note, { color: p.textSecondary }]}>
          No favorites yet. Tap ★ Favorite on a kanji to add it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <KanjiGrid kanji={kanji} loading={loading} onPress={openKanji} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
