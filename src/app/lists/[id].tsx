// List detail: study the list, add/remove kanji, rename, delete. Tapping a kanji
// chip opens the kanji detail; long-press prompts to remove from this list.
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  deleteList,
  getList,
  getListMembers,
  KanjiList,
  removeKanjiFromList,
  renameList,
} from '@/data/repository/lists';
import { frequencyRank, KanjiWithSrs } from '@/data/types';
import { LoadRequest } from '@/state/studyStore';
import { Btn } from '@/study/components/Btn';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { usePalette } from '@/ui/theme';

export default function ListDetail() {
  const router = useRouter();
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const listId = Number(params.id);

  const [list, setList] = useState<KanjiList | null | undefined>(undefined);
  const [members, setMembers] = useState<KanjiWithSrs[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const refresh = useCallback(() => {
    let active = true;
    Promise.all([getList(listId), getListMembers(listId)]).then(([l, m]) => {
      if (!active) return;
      m.sort((a, b) => frequencyRank(a.kanji) - frequencyRank(b.kanji));
      setList(l);
      setMembers(m);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [listId]);

  useFocusEffect(refresh);

  if (list === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (list === null) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <Text style={{ color: p.text }}>List not found.</Text>
      </View>
    );
  }

  const startStudy = () => {
    const req: LoadRequest = { kind: 'list', listId };
    router.push({ pathname: '/study', params: { req: JSON.stringify(req) } });
  };

  const openKanji = (character: string) =>
    router.push({ pathname: '/kanji/[character]', params: { character } });

  const confirmRemove = (character: string) => {
    Alert.alert('Remove kanji', `Remove ${character} from "${list.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeKanjiFromList(listId, character);
          refresh();
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete list', `Delete "${list.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteList(listId);
          router.back();
        },
      },
    ]);
  };

  const submitRename = async () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== list.name) {
      await renameList(listId, trimmed);
    }
    setRenaming(false);
    refresh();
  };

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.header}>
        {renaming ? (
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onSubmitEditing={submitRename}
            onBlur={submitRename}
            autoFocus
            returnKeyType="done"
            style={[styles.title, styles.titleInput, { color: p.text, borderColor: p.border }]}
          />
        ) : (
          <Pressable
            onPress={() => {
              setDraftName(list.name);
              setRenaming(true);
            }}
            style={styles.titleWrap}
          >
            <Text style={[styles.title, { color: p.text }]} numberOfLines={1}>
              {list.name}
            </Text>
            <Text style={[styles.editHint, { color: p.textSecondary }]}>Tap to rename</Text>
          </Pressable>
        )}
        <Text style={[styles.subheader, { color: p.textSecondary }]}>
          {`${members.length} kanji`}
        </Text>

        <View style={styles.actions}>
          <Btn
            label="Study"
            onPress={startStudy}
            disabled={members.length === 0}
            style={styles.actionBtn}
          />
          <Btn
            label="Add kanji"
            variant="outlined"
            onPress={() =>
              router.push({ pathname: '/lists/[id]/add', params: { id: String(listId) } })
            }
            style={styles.actionBtn}
          />
          <Btn label="Delete" variant="outlined" onPress={confirmDelete} style={styles.actionBtn} />
        </View>
      </View>

      {members.length === 0 && !loading ? (
        <Text style={[styles.empty, { color: p.textSecondary }]}>
          No kanji yet. Tap "Add kanji" to start.
        </Text>
      ) : (
        <KanjiGrid
          kanji={members}
          loading={loading}
          onPress={openKanji}
          onLongPress={confirmRemove}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  titleWrap: { paddingVertical: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  titleInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  editHint: { fontSize: 11, marginTop: 2 },
  subheader: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 4, marginHorizontal: -4 },
  actionBtn: { flex: 1 },
  empty: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, paddingTop: 24 },
});
