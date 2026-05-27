// Ported from kanji/view/KanjiScreen.kt — grade browse with SRS-colored chips.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GRADE_TABS, useBrowseStore } from '@/state/kanjiBrowseStore';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { usePalette } from '@/ui/theme';

export default function KanjiBrowse() {
  const router = useRouter();
  const p = usePalette();
  const selectedGrade = useBrowseStore((s) => s.selectedGrade);
  const kanji = useBrowseStore((s) => s.kanji);
  const suspended = useBrowseStore((s) => s.suspended);
  const loading = useBrowseStore((s) => s.loading);
  const selectGrade = useBrowseStore((s) => s.selectGrade);

  useEffect(() => {
    useBrowseStore.getState().init();
  }, []);

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={styles.tabRowContent}>
        {GRADE_TABS.map((tab) => (
          <Pressable key={tab.value} onPress={() => selectGrade(tab.value)} style={styles.tab}>
            <Text
              style={[
                styles.tabLabel,
                { color: selectedGrade === tab.value ? p.primary : p.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <KanjiGrid kanji={kanji} loading={loading} onPress={openKanji} suspended={suspended} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabRow: { flexGrow: 0, height: 44 },
  tabRowContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 10 },
  tabLabel: { fontSize: 14, fontWeight: '600' },
});
