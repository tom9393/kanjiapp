// User study lists. Lists the user's saved lists with a row to create a new one;
// tapping a row opens the list detail. Practice-only — sessions do not affect SRS.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createList, getLists, KanjiListSummary } from '@/data/repository/lists';
import { shared } from '@/stats/primitives';
import { NewListRow } from '@/ui/NewListRow';
import { usePalette } from '@/ui/theme';

export default function ListsIndex() {
  const router = useRouter();
  const p = usePalette();
  const [lists, setLists] = useState<KanjiListSummary[]>([]);

  const refresh = useCallback(() => {
    getLists().then(setLists);
  }, []);

  useFocusEffect(refresh);

  const handleCreate = async (name: string) => {
    await createList(name);
    refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: p.background }}>
      <Text style={[styles.intro, { color: p.textSecondary }]}>
        Build your own kanji lists. Lists are practice-only — sessions don't affect daily reviews.
      </Text>

      <NewListRow onCreate={handleCreate} style={styles.createRow} />

      {lists.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="list-outline" size={48} color={p.textSecondary} style={styles.emptyIcon} />
          <Text style={[styles.empty, { color: p.textSecondary }]}>No lists yet. Create one above.</Text>
        </View>
      ) : (
        lists.map((list) => (
          <Pressable
            key={list.id}
            onPress={() => router.push({ pathname: '/lists/[id]', params: { id: String(list.id) } })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: p.surfaceVariant, borderColor: p.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.rowName, { color: p.text }]} numberOfLines={1}>
              {list.name}
            </Text>
            <Text style={[shared.bodySmall, { color: p.textSecondary }]}>
              {`${list.memberCount} kanji`}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingHorizontal: 16 },
  intro: { fontSize: 13, paddingTop: 4, paddingBottom: 10 },
  createRow: { marginBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingTop: 32 },
  emptyIcon: { marginBottom: 12, opacity: 0.6 },
  empty: { fontSize: 14, textAlign: 'center' },
  row: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowName: { flex: 1, fontSize: 16, fontWeight: '600' },
});
