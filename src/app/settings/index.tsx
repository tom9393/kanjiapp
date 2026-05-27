// Settings menu: one row per section. Tapping a row opens /settings/[section], which edits
// that group's preferences (Appearance, Study, etc.).
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SECTIONS } from '@/settings/sections';
import { usePalette } from '@/ui/theme';

export default function SettingsMenu() {
  const router = useRouter();
  const p = usePalette();

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: p.surfaceVariant }]}>
        {SECTIONS.map((section, index) => (
          <View key={section.id}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: p.border }]} />}
            <Pressable
              onPress={() => router.push({ pathname: '/settings/[section]', params: { section: section.id } })}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.background }]}
            >
              <Text style={[styles.label, { color: p.text }]}>{section.title}</Text>
              <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 24 },
  card: { borderRadius: 12, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  label: { flex: 1, fontSize: 16 },
  chevron: { fontSize: 22 },
});
