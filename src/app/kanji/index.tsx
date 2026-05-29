// Ported from kanji/view/KanjiScreen.kt — grade browse with SRS-colored chips.
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Prefs } from '@/settings/preferences';
import { GRADE_TABS, useBrowseStore } from '@/state/kanjiBrowseStore';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { KanjiList } from '@/ui/KanjiList';
import { useKanjiView, ViewModeToggle } from '@/ui/ViewModeToggle';
import { useNav } from '@/ui/nav';
import { usePalette } from '@/ui/theme';

export default function KanjiBrowse() {
  const p = usePalette();
  const { kanji: openKanji } = useNav();
  const selectedGrade = useBrowseStore((s) => s.selectedGrade);
  const kanji = useBrowseStore((s) => s.kanji);
  const suspended = useBrowseStore((s) => s.suspended);
  const loading = useBrowseStore((s) => s.loading);
  const selectGrade = useBrowseStore((s) => s.selectGrade);
  const [view, setView] = useKanjiView(Prefs.kanjiBrowseView);

  useEffect(() => {
    useBrowseStore.getState().init();
  }, []);

  const Results = view === 'grid' ? KanjiGrid : KanjiList;

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.topRow}>
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
        <View style={styles.toggleSlot}>
          <ViewModeToggle mode={view} onChange={setView} />
        </View>
      </View>
      <Results kanji={kanji} loading={loading} onPress={openKanji} suspended={suspended} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  toggleSlot: { paddingHorizontal: 8 },
  tabRow: { flex: 1, height: 44 },
  tabRowContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 10 },
  tabLabel: { fontSize: 14, fontWeight: '600' },
});
