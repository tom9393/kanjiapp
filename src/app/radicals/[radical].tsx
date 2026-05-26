// Kanji that contain a given radical, served from SRS-joined data. Mirrors the grade browse grid.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { radicals } from '@/data/radicals';
import { getKanjiWithSrsByCharacters } from '@/data/repository/kanji';
import { KanjiWithSrs } from '@/data/types';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { usePalette } from '@/ui/theme';

export default function RadicalKanji() {
  const { radical } = useLocalSearchParams<{ radical: string }>();
  const router = useRouter();
  const p = usePalette();
  const [kanji, setKanji] = useState<KanjiWithSrs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const entry = radicals.find((r) => r.r === radical);
      setKanji(entry ? await getKanjiWithSrsByCharacters(entry.k) : []);
      setLoading(false);
    })();
  }, [radical]);

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <Stack.Screen options={{ title: radical }} />
      <KanjiGrid kanji={kanji} loading={loading} onPress={openKanji} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
