// Custom Study menu: pick a category (Grade / JLPT / Kanken) and a level. Tapping a
// level chip navigates to the chunk picker. Custom sessions do not affect SRS.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatCard, shared } from '@/stats/primitives';
import { CUSTOM_CATEGORIES } from '@/study/customLevels';
import { usePalette } from '@/ui/theme';

export default function CustomStudyMenu() {
  const router = useRouter();
  const p = usePalette();

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: p.background }}>
      <Text style={[styles.intro, { color: p.textSecondary }]}>
        Practice any set without affecting your daily reviews. Each session covers 10 kanji.
      </Text>
      {CUSTOM_CATEGORIES.map((cat) => (
        <StatCard key={cat.field} title={cat.title}>
          <View style={styles.chipRow}>
            {cat.levels.map((lvl) => (
              <Pressable
                key={lvl.value}
                onPress={() =>
                  router.push({ pathname: '/custom/[category]/[level]', params: { category: cat.field, level: String(lvl.value) } })
                }
                style={[styles.chip, { borderColor: p.border }]}
              >
                <Text style={[shared.bodySmall, { color: p.text }]}>{lvl.label}</Text>
              </Pressable>
            ))}
          </View>
        </StatCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10 },
  intro: { fontSize: 13, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
});
