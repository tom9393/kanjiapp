// Custom Study chunk picker. Lists 10-kanji chunks for the chosen category+level,
// each labeled with its range and leading characters. Tapping a chunk starts study.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CUSTOM_CHUNK_SIZE, listCustomChunks } from '@/domain/studyQueueSource';
import { LoadRequest } from '@/state/studyStore';
import { findCategory, findLevel } from '@/study/customLevels';
import { usePalette } from '@/ui/theme';

interface Chunk {
  start: number;
  characters: string[];
}

export default function CustomChunkPicker() {
  const router = useRouter();
  const p = usePalette();
  const params = useLocalSearchParams<{ category: string; level: string }>();
  const category = findCategory(params.category ?? '');
  const levelValue = Number(params.level);
  const level = category ? findLevel(category, levelValue) : undefined;

  const [chunks, setChunks] = useState<Chunk[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!category || !level) return;
    setChunks(null);
    listCustomChunks({ category: category.field, level: level.value }).then((res) => {
      if (!cancelled) setChunks(res);
    });
    return () => {
      cancelled = true;
    };
  }, [category, level]);

  if (!category || !level) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <Text style={{ color: p.text }}>Unknown level.</Text>
      </View>
    );
  }

  if (chunks === null) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (chunks.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <Text style={{ color: p.text }}>{`No kanji available for ${level.label}.`}</Text>
      </View>
    );
  }

  const start = (index: number) => {
    const req: LoadRequest = {
      kind: 'custom',
      filter: { category: category.field, level: level.value },
      chunk: index,
    };
    router.push({ pathname: '/study', params: { req: JSON.stringify(req) } });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: p.background }}>
      <Text style={[styles.header, { color: p.text }]}>{`${category.title} · ${level.label}`}</Text>
      <Text style={[styles.subheader, { color: p.textSecondary }]}>
        {`${chunks.length} chunk${chunks.length === 1 ? '' : 's'} · ${CUSTOM_CHUNK_SIZE} kanji each`}
      </Text>
      {chunks.map((chunk, i) => {
        const from = chunk.start + 1;
        const to = chunk.start + chunk.characters.length;
        return (
          <Pressable
            key={chunk.start}
            onPress={() => start(i)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: p.surfaceVariant, borderColor: p.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.range, { color: p.textSecondary }]}>{`${from}–${to}`}</Text>
            <Text style={[styles.preview, { color: p.text }]} numberOfLines={1}>
              {chunk.characters.join(' ')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 10, paddingHorizontal: 16 },
  header: { fontSize: 18, fontWeight: '700' },
  subheader: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  row: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  range: { fontSize: 11, marginBottom: 4 },
  preview: { fontSize: 18, letterSpacing: 1 },
});
