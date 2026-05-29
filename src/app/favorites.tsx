// Favorites: the kanji the user has starred (from the kanji detail screen), shown as a grid.
// Reloads on focus so a star toggled elsewhere is reflected when returning here.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getFavoriteKanji } from '@/data/repository/flags';
import { byFrequency, KanjiWithSrs } from '@/data/types';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { useNav } from '@/ui/nav';
import { usePalette } from '@/ui/theme';

export default function Favorites() {
  const p = usePalette();
  const { kanji: openKanji } = useNav();
  const [kanji, setKanji] = useState<KanjiWithSrs[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getFavoriteKanji().then((k) => {
        if (!active) return;
        k.sort(byFrequency); // most common first
        setKanji(k);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  if (!loading && kanji.length === 0) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: p.background }]}>
        <Ionicons name="heart-outline" size={48} color={p.textSecondary} style={styles.emptyIcon} />
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
  emptyIcon: { marginBottom: 12, opacity: 0.6 },
  note: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
